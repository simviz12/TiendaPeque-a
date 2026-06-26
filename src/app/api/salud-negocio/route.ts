import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await verifyJwtAndGetUser();
  if (!user || user.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const url = new URL(request.url);
  const startDateParam = url.searchParams.get('startDate');
  const endDateParam = url.searchParams.get('endDate');

  try {
    const now = new Date();
    let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date;
    let durationDays = 30; // Default para proyección

    if (startDateParam && endDateParam) {
      currentStart = new Date(startDateParam);
      currentEnd = new Date(endDateParam);
      const diffTime = Math.abs(currentEnd.getTime() - currentStart.getTime());
      durationDays = diffTime / (1000 * 60 * 60 * 24) || 1;

      prevEnd = new Date(currentStart.getTime() - 1);
      prevStart = new Date(currentStart.getTime() - diffTime);
    } else {
      // Rangos de fechas: mes actual y mes anterior por defecto
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      durationDays = now.getDate() || 1; // Para promedio diario
    }

    // ── 1. DATOS EN PARALELO (1 roundtrip) ──────────────────────────────────
    const [currentAgg, prevAgg, allProducts, soldGroupCurrent] = await Promise.all([
      // Ventas periodo actual
      prisma.venta.aggregate({
        where: { fecha: { gte: currentStart, lte: currentEnd } },
        _sum: { total: true },
        _count: { id: true },
      }),
      // Ventas periodo anterior
      prisma.venta.aggregate({
        where: { fecha: { gte: prevStart, lte: prevEnd } },
        _sum: { total: true },
      }),
      // Inventario completo para stock saludable
      prisma.producto.findMany({
        select: { id: true, stock: true, categoriaId: true },
      }),
      // Productos vendidos este periodo (para diversidad real)
      prisma.venta.groupBy({
        by: ['productoId'],
        where: { fecha: { gte: currentStart, lte: currentEnd } },
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

    // ── 5. PROYECCIÓN VENTAS (20%) — velocidad diaria real del periodo ────────
    const dailyAvg = durationDays > 0 ? currentRevenue / durationDays : 0;
    // Siempre proyectamos a un mes típico (30 días) para mantener la escala comparable
    const projectedMonthEnd = dailyAvg * 30;

    let projectionScore: number;
    let proyeccionValor: number;

    // Calculamos los ingresos previos normalizados a 30 días para comparar peras con peras
    const prevDurationDays = Math.abs(prevEnd.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24) || 30;
    const prevDailyAvg = prevRevenue / prevDurationDays;
    const prevNormalized = prevDailyAvg * 30;

    if (prevNormalized === 0 && projectedMonthEnd > 0) {
      projectionScore = 90;
      proyeccionValor = Math.round(projectedMonthEnd);
    } else if (prevNormalized > 0) {
      const projGrowthPct = ((projectedMonthEnd - prevNormalized) / prevNormalized) * 100;
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
