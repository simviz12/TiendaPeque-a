import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';
import { z } from 'zod';
import { cookies } from 'next/headers';

const bodySchema = z.object({
  fecha: z.string().optional(),
});

// Helper to resolve user from header or cookie
async function getAuthUser(request: Request) {
  const cookieStore = await cookies();
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || cookieStore.get('tienda_casera_token')?.value;
  if (!token) return null;
  return await verifyJwtAndGetUser(token);
}

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const url = new URL(request.url);
  const isPreview = url.searchParams.get('preview') === 'true';

  if (isPreview) {
    // Calculate today's sales preview
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const aggregate = await prisma.venta.aggregate({
      where: { fecha: { gte: todayStart, lte: todayEnd } },
      _sum: { total: true },
      _count: { id: true },
    });

    const totalVentas = Number(aggregate._sum?.total ?? 0);
    const totalTransactions = aggregate._count?.id ?? 0;

    return NextResponse.json({
      fecha: todayStart.toISOString(),
      totalVentas: totalVentas,
      totalEfectivoEsperado: totalVentas,
      numeroTransacciones: totalTransactions,
      usuario: { nombre: user.nombre },
    });
  }

  // List recent entries (ADMIN only)
  if (user.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  }

  const registros = await prisma.cierreCaja.findMany({
    orderBy: { fecha: 'desc' },
    take: 30,
    include: {
      usuario: {
        select: {
          nombre: true,
          rol: true,
        },
      },
    },
  });

  // Return raw array directly as expected by the client component
  return NextResponse.json(registros);
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional
  }

  const parsed = bodySchema.safeParse(body);
  const fechaStr = parsed.success ? parsed.data.fecha : undefined;
  const fecha = fechaStr ? new Date(fechaStr) : new Date();

  try {
    const start = new Date(fecha);
    start.setHours(0, 0, 0, 0);
    const end = new Date(fecha);
    end.setHours(23, 59, 59, 999);

    // Sum sales for this day
    const aggregate = await prisma.venta.aggregate({
      where: { fecha: { gte: start, lte: end } },
      _sum: { total: true },
      _count: { id: true },
    });

    const totalVentas = Number(aggregate._sum?.total ?? 0);
    const numTransacciones = aggregate._count?.id ?? 0;

    const cierre = await prisma.cierreCaja.create({
      data: {
        fecha: start,
        totalVentas: totalVentas,
        totalEfectivoEsperado: totalVentas,
        numeroTransacciones: numTransacciones,
        usuarioId: user.id,
      },
    });

    return NextResponse.json(cierre, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ message: e.message || 'Error al guardar cierre' }, { status: 500 });
  }
}
