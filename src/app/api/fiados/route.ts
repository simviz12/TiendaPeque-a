import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await verifyJwtAndGetUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado. Por favor inicia sesión.' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const { estado, search, limit } = Object.fromEntries(url.searchParams.entries());
  const where: Record<string, unknown> = {};

  const queryLimit = limit ? parseInt(limit) : 100;

  if (estado) {
    where.estado = estado;
  }

  if (search) {
    where.cliente = {
      nombre: {
        contains: search,
        mode: 'insensitive',
      }
    };
  }

  try {
    // Obtener totales reales de TODOS los fiados (sin límite de página)
    const [aggregateTodos, aggregatePendientes, fiados] = await Promise.all([
      // Suma total de lo fiado
      prisma.fiado.aggregate({
        where,
        _sum: { montoTotal: true, montoPagado: true },
        _count: { id: true },
      }),
      // Solo pendientes y parciales (dinero en la calle)
      prisma.fiado.aggregate({
        where: { ...where, estado: { in: ['PENDIENTE', 'PAGADO_PARCIAL'] } },
        _sum: { montoTotal: true, montoPagado: true },
      }),
      // Lista paginada
      prisma.fiado.findMany({
        where,
        orderBy: { fechaCreacion: 'desc' },
        take: queryLimit,
        include: {
          cliente: true,
          transaccion: {
            include: {
              ventas: {
                include: { producto: true },
              },
            },
          },
        },
      }),
    ]);

    const totalFiado = Number(aggregateTodos._sum?.montoTotal ?? 0);
    const totalPagado = Number(aggregateTodos._sum?.montoPagado ?? 0);
    const montoPendiente = Number(aggregatePendientes._sum?.montoTotal ?? 0) - Number(aggregatePendientes._sum?.montoPagado ?? 0);

    return NextResponse.json({
      success: true,
      data: fiados,
      totales: {
        totalFiado,
        totalRecaudado: totalPagado,
        dineroEnLaCalle: montoPendiente,
        totalFiados: aggregateTodos._count?.id ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al obtener fiados' },
      { status: 500 }
    );
  }
}
