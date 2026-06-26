import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  all: z.string().optional(),
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
  const { startDate, endDate, all } = parseResult.data;

  try {
    const where: any = {};
    if (startDate && endDate) {
      where.fecha = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (!all) {
      // Default to last 30 days only when no explicit period is requested
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      where.fecha = { gte: defaultStart };
    }
    // If all=true → no date filter → returns full history

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

    // 2. Ventas por Categoría — una sola query batch en vez de N+1
    const byCategory = await prisma.venta.groupBy({
      by: ['productoId'],
      where,
      _sum: { total: true, cantidad: true },
    });

    // Obtener todos los productos necesarios en UNA sola query
    const productoIds = byCategory.map((item) => item.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds } },
      include: { categoria: true },
    });
    const productoMap = new Map(productos.map((p) => [p.id, p]));

    const categoryMap = new Map<string, { total: number; cantidad: number }>();
    for (const item of byCategory) {
      const producto = productoMap.get(item.productoId);
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

    // 3. Ventas por Día — agrupado en memoria
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
