import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';
import { z } from 'zod';

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
  
  // Calculate current month date range
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  try {
    // 1. Group by product for top sold
    const top = await prisma.venta.groupBy({
      by: ['productoId'],
      where: { fecha: { gte: start, lte: end } },
      _sum: { cantidad: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: limit,
    });

    // 2. Group by product for bottom sold
    const bottom = await prisma.venta.groupBy({
      by: ['productoId'],
      where: { fecha: { gte: start, lte: end } },
      _sum: { cantidad: true },
      orderBy: { _sum: { cantidad: 'asc' } },
      take: limit,
    });

    // Enrich helper
    const enrich = async (items: { productoId: string; _sum: { cantidad: number | null } }[]) => {
      return Promise.all(
        items.map(async (it) => {
          const prod = await prisma.producto.findUnique({
            where: { id: it.productoId },
            include: { categoria: true }
          });
          
          const cantidad = it._sum.cantidad ?? 0;
          const precioNum = prod ? Number(prod.precio) : 0;
          const total = precioNum * cantidad;

          return {
            id: it.productoId,
            nombre: prod?.nombre ?? 'Desconocido',
            categoria: prod?.categoria?.nombre ?? 'Otros',
            cantidad: cantidad,
            total: total,
            stock: prod?.stock ?? 0,
          };
        })
      );
    };

    const masVendidos = await enrich(top);
    const menosVendidos = await enrich(bottom);

    // Return the exact raw structure expected by dashboard-client.tsx
    return NextResponse.json({
      masVendidos,
      menosVendidos
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
