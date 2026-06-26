import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  limit: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await verifyJwtAndGetUser();
  if (!user || user.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const url = new URL(request.url);
  const params = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!params.success) {
    return NextResponse.json({ message: 'Parámetros inválidos' }, { status: 400 });
  }
  const limit = params.data.limit ? parseInt(params.data.limit) : 5;

  const startDateParam = url.searchParams.get('startDate');
  const endDateParam = url.searchParams.get('endDate');

  let start: Date;
  let end: Date;

  if (startDateParam && endDateParam) {
    start = new Date(startDateParam);
    end = new Date(endDateParam);
  } else {
    // Fallback: Calculate current month date range
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  try {
    // 1. Group by product for top sold
    const top = await prisma.venta.groupBy({
      by: ['productoId'],
      where: { fecha: { gte: start, lte: end } },
      _sum: { cantidad: true, total: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: limit,
    });

    // 2. Group by product for bottom sold
    const bottom = await prisma.venta.groupBy({
      by: ['productoId'],
      where: { fecha: { gte: start, lte: end } },
      _sum: { cantidad: true, total: true },
      orderBy: { _sum: { cantidad: 'asc' } },
      take: limit,
    });

    // Obtener todos los productos necesarios en UNA sola query (batch)
    const allProductoIds = Array.from(
      new Set([...top.map((i) => i.productoId), ...bottom.map((i) => i.productoId)])
    );
    const productos = await prisma.producto.findMany({
      where: { id: { in: allProductoIds } },
      include: { categoria: true },
    });
    const productoMap = new Map(productos.map((p) => [p.id, p]));

    // Enrich helper usando el map en memoria (sin más queries)
    const enrich = (items: { productoId: string; _sum: { cantidad: number | null; total?: any } }[]) => {
      return items.map((it) => {
        const prod = productoMap.get(it.productoId);
        const cantidad = it._sum.cantidad ?? 0;
        // Usar el total acumulado de ventas si está disponible
        const totalVentas = it._sum.total ? Number(it._sum.total) : (prod ? Number(prod.precio) * cantidad : 0);

        return {
          id: it.productoId,
          nombre: prod?.nombre ?? 'Desconocido',
          categoria: prod?.categoria?.nombre ?? 'Otros',
          cantidad,
          total: totalVentas,
          stock: prod?.stock ?? 0,
        };
      });
    };

    const masVendidos = enrich(top);
    const menosVendidos = enrich(bottom);

    return NextResponse.json({
      masVendidos,
      menosVendidos
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
