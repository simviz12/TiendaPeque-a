import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { z } from 'zod';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';

// ─── Schema de entrada ─────────────────────────────────────────────────────
const itemCarritoSchema = z.object({
  productoId: z.string().min(1, 'Producto inválido.'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0.'),
});

const transaccionSchema = z.object({
  items: z.array(itemCarritoSchema).min(1, 'El carrito no puede estar vacío.'),
  pagoEfectivo:    z.number().min(0).default(0),
  pagoNequi:       z.number().min(0).default(0),
  pagoBancolombia: z.number().min(0).default(0),
  pagoFiado:       z.number().min(0).default(0),
  clienteId:       z.string().optional(),
  clienteNombre:   z.string().optional(),
  clienteTelefono: z.string().optional(),
  notas:           z.string().optional(),
});

export const dynamic = 'force-dynamic';

// ─── GET /api/ventas — devuelve Transacciones con sus ítems ────────────────
export async function GET(request: Request) {
  const user = await verifyJwtAndGetUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado. Por favor inicia sesión.' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { vendedorId, from, to } = params;
  const page = Math.max(1, parseInt(params.page ?? '1'));
  const size = Math.max(1, Math.min(10000, parseInt(params.size ?? '30')));
  const skip = (page - 1) * size;

  const where: Record<string, unknown> = {};
  if (user.rol === 'VENDEDOR') {
    where.vendedorId = user.id;
  } else if (vendedorId) {
    where.vendedorId = vendedorId;
  }
  if (from || to) {
    where.fecha = {} as Record<string, Date>;
    if (from) (where.fecha as Record<string, Date>).gte = new Date(from);
    if (to)   (where.fecha as Record<string, Date>).lte = new Date(to);
  }

  // Obtener totales y registros paginados en paralelo
  const [aggregate, total, transacciones] = await Promise.all([
    prisma.transaccion.aggregate({
      where,
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.transaccion.count({ where }),
    prisma.transaccion.findMany({
      where,
      orderBy: { fecha: 'desc' },
      skip,
      take: size,
      include: {
        vendedor: { select: { id: true, nombre: true, usuario: true } },
        ventas: {
          include: {
            producto: { include: { categoria: true } },
          },
        },
        fiado: {
          include: { cliente: { select: { id: true, nombre: true } } },
        },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: transacciones,
    meta: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
    totales: {
      totalRecaudado: Number(aggregate._sum?.total ?? 0),
      totalTransacciones: aggregate._count?.id ?? 0,
    },
  });
}

// ─── POST /api/ventas — registra el carrito completo ──────────────────────
export async function POST(request: Request) {
  const user = await verifyJwtAndGetUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado. Por favor inicia sesión.' },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = transaccionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos.' },
      { status: 400 },
    );
  }

  const {
    items,
    pagoEfectivo,
    pagoNequi,
    pagoBancolombia,
    pagoFiado,
    clienteId,
    clienteNombre,
    clienteTelefono,
    notas,
  } = parsed.data;

  // Validar: si hay fiado se necesita cliente
  if (pagoFiado > 0 && !clienteId && (!clienteNombre || clienteNombre.trim() === '')) {
    return NextResponse.json(
      { success: false, error: 'Debe seleccionar o crear un cliente para el fiado.' },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cargar todos los productos del carrito
      const productoIds = items.map((i) => i.productoId);
      const productos = await tx.producto.findMany({
        where: { id: { in: productoIds } },
      });

      const productoMap = new Map(productos.map((p) => [p.id, p]));

      // 2. Verificar stock y calcular total
      let total = 0;
      for (const item of items) {
        const producto = productoMap.get(item.productoId);
        if (!producto) throw new Error(`Producto no encontrado: ${item.productoId}`);
        if (producto.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para "${producto.nombre}" (disponible: ${producto.stock}).`);
        }
        total += Number(producto.precio) * item.cantidad;
      }

      // 3. Validar que los pagos sumen el total
      const totalPagos = pagoEfectivo + pagoNequi + pagoBancolombia + pagoFiado;
      const diff = Math.abs(totalPagos - total);
      if (diff > 0.01) {
        throw new Error(
          `La suma de pagos (${totalPagos.toFixed(0)}) no coincide con el total (${total.toFixed(0)}).`
        );
      }

      // 4. Descontar stock de todos los productos
      for (const item of items) {
        const updated = await tx.producto.updateMany({
          where: { id: item.productoId, stock: { gte: item.cantidad } },
          data: { stock: { decrement: item.cantidad } },
        });
        if (updated.count === 0) {
          const p = productoMap.get(item.productoId)!;
          throw new Error(`Stock insuficiente para "${p.nombre}".`);
        }
      }

      // 5. Crear la Transaccion
      const transaccion = await tx.transaccion.create({
        data: {
          vendedorId: user.id,
          total,
          pagoEfectivo,
          pagoNequi,
          pagoBancolombia,
          pagoFiado,
          fecha: new Date(),
        },
      });

      // 6. Crear ítems (Venta) para cada producto del carrito
      for (const item of items) {
        const producto = productoMap.get(item.productoId)!;
        const precioUnitario = Number(producto.precio);
        await tx.venta.create({
          data: {
            productoId: item.productoId,
            transaccionId: transaccion.id,
            cantidad: item.cantidad,
            precioUnitario,
            total: precioUnitario * item.cantidad,
            fecha: new Date(),
          },
        });
      }

      // 7. Crear Fiado si aplica
      if (pagoFiado > 0) {
        let finalClienteId = clienteId;

        if (!finalClienteId) {
          let cliente = await tx.cliente.findUnique({ where: { nombre: clienteNombre! } });
          if (!cliente) {
            cliente = await tx.cliente.create({
              data: { nombre: clienteNombre!.trim(), telefono: clienteTelefono },
            });
          }
          finalClienteId = cliente.id;
        }

        await tx.fiado.create({
          data: {
            transaccionId: transaccion.id,
            clienteId: finalClienteId!,
            montoTotal: pagoFiado,
            montoPagado: 0,
            estado: 'PENDIENTE',
            notas,
          },
        });
      }

      // 8. Log de auditoría
      const resumenItems = items
        .map((i) => {
          const p = productoMap.get(i.productoId)!;
          return `${i.cantidad}x ${p.nombre}`;
        })
        .join(', ');

      const pagosStr = [
        pagoEfectivo > 0 ? `Efectivo: $${pagoEfectivo}` : '',
        pagoNequi > 0 ? `Nequi: $${pagoNequi}` : '',
        pagoBancolombia > 0 ? `Bancolombia: $${pagoBancolombia}` : '',
        pagoFiado > 0 ? `Fiado: $${pagoFiado}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      await tx.logAuditoria.create({
        data: {
          usuarioId: user.id,
          accion: `Venta (${pagosStr}): [${resumenItems}] — Total: $${total}`,
          fecha: new Date(),
        },
      });

      return transaccion;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al procesar la venta.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
