import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';

export async function GET() {
  const user = await verifyJwtAndGetUser();
  if (!user || user.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const now = new Date();

    // Rangos de fechas: mes actual y mes anterior
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // ── 1. DATOS EN PARALELO (1 roundtrip) ──────────────────────────────────
    const [currentAgg, prevAgg, allProducts, soldGroupCurrent] = await Promise.all([
      // Ventas mes actual
      prisma.venta.aggregate({
        where: { fecha: { gte: currentMonthStart } },
        _sum: { total: true },
        _count: { id: true },
      }),
      // Ventas mes anterior
      prisma.venta.aggregate({
        where: { fecha: { gte: prevMonthStart, lte: prevMonthEnd } },
        _sum: { total: true },
      }),
      // Inventario completo para stock saludable
      prisma.producto.findMany({
        select: { id: true, stock: true, categoriaId: true },
      }),
      // Productos vendidos este mes (para diversidad real)
      prisma.venta.groupBy({
        by: ['productoId'],
        where: { fecha: { gte: currentMonthStart } },
      }),
    ]);

    const currentRevenue = Number(currentAgg._sum?.total ?? 0);
    const prevRevenue = Number(prevAgg._sum?.total ?? 0);
    const currentTransactions = currentAgg._count?.id ?? 0;

    // ── 2. CRECIMIENTO VENTAS (40%) — comparación real mes-a-mes ────────────
    let growthScore: number;
    let growthValor: number;

    if (prevRevenue === 0 && currentRevenue === 0) {
      // Sin historial ni ventas actuales
      growthScore = 0;
      growthValor = 0;
    } else if (prevRevenue === 0 && currentRevenue > 0) {
      // Primer mes con ventas → excelente por defecto
      growthScore = 90;
      growthValor = 100;
    } else {
      // Crecimiento real: (actual - anterior) / anterior * 100
      const growthPct = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
      growthValor = Math.round(growthPct);
      // Escala: -50% → 0, 0% → 50, +100% → 100 (cap en ambos extremos)
      growthScore = Math.min(100, Math.max(0, 50 + growthPct / 2));
    }
    const growthContrib = Math.round(growthScore * 0.40);

    // ── 3. STOCK SALUDABLE (20%) — productos con stock >= 5 ─────────────────
    const totalProductsCount = allProducts.length;
    const healthyProductsCount = allProducts.filter((p) => p.stock >= 5).length;
    const stockScore = totalProductsCount > 0
      ? (healthyProductsCount / totalProductsCount) * 100
      : 0;
    const stockContrib = Math.round(stockScore * 0.20);

    // ── 4. DIVERSIDAD CATEGORÍAS (20%) — categorías con ventas este mes ──────
    const soldProductIds = new Set(soldGroupCurrent.map((s) => s.productoId));
    const soldCategoryIds = new Set(
      allProducts.filter((p) => soldProductIds.has(p.id)).map((p) => p.categoriaId)
    );
    const totalCategoryIds = new Set(allProducts.map((p) => p.categoriaId));

    const diversityScore = totalCategoryIds.size > 0
      ? (soldCategoryIds.size / totalCategoryIds.size) * 100
      : 0;
    const diversityContrib = Math.round(diversityScore * 0.20);

    // ── 5. PROYECCIÓN VENTAS (20%) — velocidad diaria real del mes ───────────
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyAvg = dayOfMonth > 0 ? currentRevenue / dayOfMonth : 0;
    const projectedMonthEnd = dailyAvg * daysInMonth;

    let projectionScore: number;
    let proyeccionValor: number;

    if (prevRevenue === 0 && projectedMonthEnd > 0) {
      projectionScore = 90;
      proyeccionValor = Math.round(projectedMonthEnd);
    } else if (prevRevenue > 0) {
      const projGrowthPct = ((projectedMonthEnd - prevRevenue) / prevRevenue) * 100;
      projectionScore = Math.min(100, Math.max(0, 50 + projGrowthPct / 2));
      proyeccionValor = Math.round(projectedMonthEnd);
    } else {
      projectionScore = 0;
      proyeccionValor = 0;
    }
    const projectionContrib = Math.round(projectionScore * 0.20);

    // ── 6. SCORE FINAL ────────────────────────────────────────────────────────
    const finalScore = growthContrib + stockContrib + diversityContrib + projectionContrib;

    // Estado: calentando si no hay datos suficientes (menos de 3 días con transacciones)
    const estado = currentTransactions >= 3 || prevRevenue > 0 ? 'listo' : 'calentando_motores';
    const mensaje = estado === 'calentando_motores'
      ? 'Se requiere acumular al menos algunos días de historial de ventas.'
      : finalScore > 70
        ? '¡Excelente salud del negocio! Sigue así, el negocio va viento en popa.'
        : finalScore > 40
          ? 'Salud estable. Buen rendimiento, pero hay oportunidades de mejora.'
          : 'Salud deficiente. ¡Necesitamos impulsar las ventas y revisar los niveles de stock!';

    return NextResponse.json({
      estado,
      mensaje,
      score: finalScore,
      componentes: {
        crecimiento: {
          valor: growthValor,          // % de crecimiento real vs mes anterior
          score: Math.round(growthScore),
          contribucion: growthContrib,
        },
        stock: {
          total: totalProductsCount,
          saludables: healthyProductsCount,
          score: Math.round(stockScore),
          contribucion: stockContrib,
        },
        diversidad: {
          total: totalCategoryIds.size,
          vendidas: soldCategoryIds.size,
          score: Math.round(diversityScore),
          contribucion: diversityContrib,
        },
        proyeccion: {
          proyeccion: proyeccionValor,  // ingresos proyectados a fin de mes
          lineaBase: prevRevenue,
          score: Math.round(projectionScore),
          contribucion: projectionContrib,
        },
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Error en el servidor' }, { status: 500 });
  }
}
