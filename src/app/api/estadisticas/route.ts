import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';
import { z } from 'zod';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export async function GET(request: Request) {
  const user = await verifyJwtAndGetUser();
  if (!user || user.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const url = new URL(request.url);
  const parseResult = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parseResult.success) {
    return NextResponse.json({ message: 'Parámetros inválidos' }, { status: 400 });
  }
  const { startDate, endDate } = parseResult.data;

  try {
    const where: any = {};
    if (startDate && endDate) {
      where.fecha = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    // 1. Totales Generales
    const totalAggregate = await prisma.venta.aggregate({
      where,
      _sum: { total: true, cantidad: true },
      _count: { id: true }
    });

    const totalesGenerales = {
      ventas: totalAggregate._count.id,
      unidades: totalAggregate._sum.cantidad ?? 0,
      total: Number(totalAggregate._sum.total ?? 0)
    };

    // 2. Ventas por Categoría
    const byCategory = await prisma.venta.groupBy({
      by: ['productoId'],
      where,
      _sum: { total: true, cantidad: true },
    });

    const categoryMap = new Map<string, { total: number; cantidad: number }>();
    for (const item of byCategory) {
      const producto = await prisma.producto.findUnique({
        where: { id: item.productoId },
        include: { categoria: true },
      });
      const catName = producto?.categoria?.nombre ?? 'Otros';
      const existing = categoryMap.get(catName) || { total: 0, cantidad: 0 };
      existing.total += Number(item._sum.total ?? 0);
      existing.cantidad += item._sum.cantidad ?? 0;
      categoryMap.set(catName, existing);
    }

    const ventasPorCategoria = Array.from(categoryMap.entries()).map(([categoria, stats]) => ({
      categoria,
      total: stats.total,
      cantidad: stats.cantidad
    }));

    // 3. Ventas por Día (calculado en memoria para compatibilidad de motores DB sin Raw SQL)
    const sales = await prisma.venta.findMany({
      where,
      select: {
        fecha: true,
        total: true
      }
    });

    const dayMap = new Map<string, number>();
    for (const sale of sales) {
      const dayStr = sale.fecha.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const existing = dayMap.get(dayStr) || 0;
      dayMap.set(dayStr, existing + Number(sale.total));
    }

    const ventasPorDia = Array.from(dayMap.entries())
      .map(([fecha, total]) => ({ fecha, total }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Return the exact raw structure expected by dashboard-client.tsx
    return NextResponse.json({
      totalesGenerales,
      ventasPorCategoria,
      ventasPorDia
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
