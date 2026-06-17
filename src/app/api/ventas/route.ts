import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { z } from 'zod';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';

const ventaSchema = z.object({
  productoId: z.string().min(1, 'El producto es obligatorio.'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0.'),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { productoId, vendedorId, from, to } = Object.fromEntries(url.searchParams.entries());
  const where: Record<string, unknown> = {};

  if (productoId) where.productoId = productoId;
  if (vendedorId) where.vendedorId = vendedorId;
  if (from || to) {
    where.fecha = {} as Record<string, Date>;
    if (from) (where.fecha as Record<string, Date>).gte = new Date(from);
    if (to) (where.fecha as Record<string, Date>).lte = new Date(to);
  }

  const ventas = await prisma.venta.findMany({
    where,
    orderBy: { fecha: 'desc' },
    include: {
      producto: {
        include: { categoria: true },
      },
      vendedor: { select: { id: true, nombre: true, usuario: true } },
    },
  });

  return NextResponse.json({ success: true, data: ventas });
}

export async function POST(request: Request) {
  // Get the logged-in user from the session cookie (set at login)
  const user = await verifyJwtAndGetUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado. Por favor inicia sesión.' },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = ventaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos.' },
      { status: 400 },
    );
  }

  const { productoId, cantidad } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({ where: { id: productoId } });
      if (!producto) throw new Error('Producto no encontrado.');
      if (producto.stock < cantidad) throw new Error('Stock insuficiente para esta venta.');

      await tx.producto.update({
        where: { id: productoId },
        data: { stock: producto.stock - cantidad },
      });

      const venta = await tx.venta.create({
        data: {
          productoId,
          vendedorId: user.id,
          cantidad,
          total: cantidad * Number(producto.precio),
          fecha: new Date(),
        },
      });

      await tx.logAuditoria.create({
        data: {
          usuarioId: user.id,
          accion: `Venta: ${cantidad} x ${producto.nombre} — Total: ${cantidad * Number(producto.precio)}`,
          fecha: new Date(),
        },
      });

      return venta;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al procesar la venta.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
