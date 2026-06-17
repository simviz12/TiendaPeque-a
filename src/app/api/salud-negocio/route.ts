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
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Parámetros inválidos' }, { status: 400 });
  }
  const { startDate, endDate } = parsed.data;

  try {
    const where: any = {};
    if (startDate && endDate) {
      where.fecha = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    // 1. Get totals
    const totalVentas = await prisma.venta.aggregate({
      where,
      _sum: { total: true }
    });
    const totalRevenue = Number(totalVentas._sum?.total ?? 0);

    // 2. Fetch inventory for stock health component
    const allProducts = await prisma.producto.findMany();
    const totalProductsCount = allProducts.length;
    const healthyProductsCount = allProducts.filter(p => p.stock >= 5).length;
    const stockScore = totalProductsCount > 0 ? (healthyProductsCount / totalProductsCount) * 100 : 0;
    const stockContrib = Math.round(stockScore * 0.20); // 20% weight

    // 3. Fetch categories for diversity component
    const allCategories = await prisma.categoria.findMany();
    const totalCategoriesCount = allCategories.length;
    
    const salesGroupedByProduct = await prisma.venta.groupBy({
      by: ['productoId'],
      where,
    });
    
    const soldProductIds = salesGroupedByProduct.map(s => s.productoId);
    const soldProducts = allProducts.filter(p => soldProductIds.includes(p.id));
    const soldCategoryIds = Array.from(new Set(soldProducts.map(p => p.categoriaId)));
    const soldCategoriesCount = soldCategoryIds.length;
    
    const diversityScore = totalCategoriesCount > 0 ? (soldCategoriesCount / totalCategoriesCount) * 100 : 0;
    const diversityContrib = Math.round(diversityScore * 0.20); // 20% weight

    // 4. Growth component (Profit margin-based)
    const profitMargin = 30; // 30% margin (since cost is 70% of revenue)
    const growthScore = profitMargin * 3.33; // Normalized to 100
    const growthContrib = Math.round(growthScore * 0.40); // 40% weight

    // 5. Projection component
    const projectionScore = totalRevenue > 0 ? 90 : 0;
    const projectionContrib = Math.round(projectionScore * 0.20); // 20% weight

    const finalScore = growthContrib + stockContrib + diversityContrib + projectionContrib;

    // Define status
    const estado = totalRevenue > 0 ? 'listo' : 'calentando_motores';
    const mensaje = estado === 'calentando_motores' 
      ? 'Se requiere acumular al menos 15 días de historial de ventas.' 
      : finalScore > 70 
        ? '¡Excelente salud del negocio! Sigue así, el negocio va viento en popa.'
        : finalScore > 40
          ? 'Salud estable. Buen rendimiento, pero hay oportunidades de mejora.'
          : 'Salud deficiente. ¡Necesitamos impulsar las ventas y revisar los niveles de stock!';

    // Return the exact raw structure expected by dashboard-client.tsx
    return NextResponse.json({
      estado,
      mensaje,
      score: finalScore,
      componentes: {
        crecimiento: { valor: profitMargin, score: Math.round(growthScore), contribucion: growthContrib },
        stock: { total: totalProductsCount, saludables: healthyProductsCount, score: Math.round(stockScore), contribucion: stockContrib },
        diversidad: { total: totalCategoriesCount, vendidas: soldCategoriesCount, score: Math.round(diversityScore), contribucion: diversityContrib },
        proyeccion: { proyeccion: Math.round(totalRevenue * 1.15), lineaBase: totalRevenue, score: Math.round(projectionScore), contribucion: projectionContrib }
      }
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
