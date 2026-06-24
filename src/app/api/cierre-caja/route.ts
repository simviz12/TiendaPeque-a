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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Sumar los campos de pago de las Transacciones del día
    const aggregate = await prisma.transaccion.aggregate({
      where: { fecha: { gte: todayStart, lte: todayEnd } },
      _sum: {
        total:           true,
        pagoEfectivo:    true,
        pagoNequi:       true,
        pagoBancolombia: true,
        pagoFiado:       true,
      },
      _count: { id: true },
    });

    return NextResponse.json({
      fecha:              todayStart.toISOString(),
      totalVentas:        Number(aggregate._sum?.total           ?? 0),
      totalEfectivo:      Number(aggregate._sum?.pagoEfectivo    ?? 0),
      totalNequi:         Number(aggregate._sum?.pagoNequi       ?? 0),
      totalBancolombia:   Number(aggregate._sum?.pagoBancolombia ?? 0),
      totalFiado:         Number(aggregate._sum?.pagoFiado       ?? 0),
      numeroTransacciones: aggregate._count?.id ?? 0,
      usuario:            { nombre: user.nombre },
    });
  }

  // Historial de cierres — solo ADMIN
  if (user.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }

  const registros = await prisma.cierreCaja.findMany({
    orderBy: { fecha: 'desc' },
    take: 30,
    include: {
      usuario: { select: { nombre: true, rol: true } },
    },
  });

  return NextResponse.json(registros);
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
    const start = new Date(fecha);
    start.setHours(0, 0, 0, 0);
    const end = new Date(fecha);
    end.setHours(23, 59, 59, 999);

    // Sumar pagos del día agrupando por Transaccion
    const aggregate = await prisma.transaccion.aggregate({
      where: { fecha: { gte: start, lte: end } },
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
        fecha:              start,
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
