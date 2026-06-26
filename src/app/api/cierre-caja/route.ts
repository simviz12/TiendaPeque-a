import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';
import { z } from 'zod';
import { cookies } from 'next/headers';

const bodySchema = z.object({
  fecha: z.string().optional(),
});

// Helper: auth por header o cookie
async function getAuthUser(request: Request) {
  const cookieStore = await cookies();
  const token =
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    cookieStore.get('tienda_casera_token')?.value;
  if (!token) return null;
  return await verifyJwtAndGetUser(token);
}

// ─── GET /api/cierre-caja ─────────────────────────────────────────────────
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const url = new URL(request.url);
  const isPreview = url.searchParams.get('preview') === 'true';

  if (isPreview) {
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');

    let whereClause: any = {};
    if (startParam && endParam) {
      whereClause.fecha = {
        gte: new Date(startParam),
        lte: new Date(endParam)
      };
      if (user.rol === 'VENDEDOR') {
        whereClause.vendedorId = user.id;
      }
    } else {
      if (user.rol === 'VENDEDOR') {
        // VENDEDOR: Calculate sales since their LAST closure
        const lastCierre = await prisma.cierreCaja.findFirst({
          where: { usuarioId: user.id },
          orderBy: { fecha: 'desc' }
        });

        let gteDate;
        if (lastCierre) {
          gteDate = lastCierre.fecha;
          whereClause.fecha = { gt: gteDate };
        } else {
          // If no previous closure, calculate from start of today
          gteDate = new Date();
          gteDate.setHours(0, 0, 0, 0);
          whereClause.fecha = { gte: gteDate };
        }
        whereClause.vendedorId = user.id;
      } else {
        // ADMIN: Default to today if no dates provided
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        whereClause.fecha = {
          gte: todayStart,
          lte: todayEnd
        };
      }
    }

    const aggregate = await prisma.transaccion.aggregate({
      where: whereClause,
      _sum: {
        total: true,
        pagoEfectivo: true,
        pagoNequi: true,
        pagoBancolombia: true,
        pagoFiado: true,
      },
      _count: { id: true },
    });

    return NextResponse.json({
      fecha: startParam && endParam ? new Date(startParam).toISOString() : undefined,
      totalVentas: Number(aggregate._sum?.total ?? 0),
      totalEfectivo: Number(aggregate._sum?.pagoEfectivo ?? 0),
      totalNequi: Number(aggregate._sum?.pagoNequi ?? 0),
      totalBancolombia: Number(aggregate._sum?.pagoBancolombia ?? 0),
      totalFiado: Number(aggregate._sum?.pagoFiado ?? 0),
      numeroTransacciones: aggregate._count?.id ?? 0,
      usuario: { nombre: user.nombre },
    });
  }

  // Historial de cierres — solo ADMIN
  if (user.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }

  const page = Number(url.searchParams.get('page') ?? '1');
  const size = Number(url.searchParams.get('size') ?? '30');
  const skip = (page - 1) * size;

  const registros = await prisma.cierreCaja.findMany({
    orderBy: { fecha: 'desc' },
    skip,
    take: size,
    include: {
      usuario: { select: { nombre: true, rol: true } },
    },
  });

  // Also return pagination metadata
  const total = await prisma.cierreCaja.count();
  return NextResponse.json({
    data: registros,
    meta: { page, size, totalPages: Math.ceil(total / size), totalRecords: total },
  });
}

// ─── POST /api/cierre-caja ────────────────────────────────────────────────
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body es opcional
  }

  const parsed = bodySchema.safeParse(body);
  const fechaStr = parsed.success ? parsed.data.fecha : undefined;
  const fecha = fechaStr ? new Date(fechaStr) : new Date();

  try {
    let whereClause: any = {};
    const cierreFecha = new Date(); // Momento exacto del cierre actual

    if (user.rol === 'VENDEDOR') {
      const lastCierre = await prisma.cierreCaja.findFirst({
        where: { usuarioId: user.id },
        orderBy: { fecha: 'desc' }
      });

      let gteDate;
      if (lastCierre) {
        gteDate = lastCierre.fecha;
        whereClause.fecha = { gt: gteDate, lte: cierreFecha };
      } else {
        gteDate = new Date(cierreFecha);
        gteDate.setHours(0, 0, 0, 0);
        whereClause.fecha = { gte: gteDate, lte: cierreFecha };
      }
      whereClause.vendedorId = user.id;
    } else {
      // Para admin (o si se envía fecha), se usa el día completo
      const start = new Date(fecha);
      start.setHours(0, 0, 0, 0);
      const end = new Date(fecha);
      end.setHours(23, 59, 59, 999);
      whereClause.fecha = { gte: start, lte: end };
    }

    // Sumar pagos del día/turno agrupando por Transaccion
    const aggregate = await prisma.transaccion.aggregate({
      where: whereClause,
      _sum: {
        total:           true,
        pagoEfectivo:    true,
        pagoNequi:       true,
        pagoBancolombia: true,
        pagoFiado:       true,
      },
      _count: { id: true },
    });

    const totalVentas        = Number(aggregate._sum?.total           ?? 0);
    const totalEfectivo      = Number(aggregate._sum?.pagoEfectivo    ?? 0);
    const totalNequi         = Number(aggregate._sum?.pagoNequi       ?? 0);
    const totalBancolombia   = Number(aggregate._sum?.pagoBancolombia ?? 0);
    const totalFiado         = Number(aggregate._sum?.pagoFiado       ?? 0);
    const numTransacciones   = aggregate._count?.id ?? 0;

    const cierre = await prisma.cierreCaja.create({
      data: {
        fecha:              cierreFecha, // Usar momento exacto en lugar del inicio del día
        totalVentas,
        totalEfectivo,
        totalNequi,
        totalBancolombia,
        totalFiado,
        numeroTransacciones: numTransacciones,
        usuarioId:           user.id,
      },
    });

    return NextResponse.json(cierre, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al guardar cierre';
    console.error(e);
    return NextResponse.json({ message }, { status: 500 });
  }
}
