import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function test() {
  try {
    const where = {};
    
    // 2. Ventas por Categoría
    const byCategory = await prisma.venta.groupBy({
      by: ['productoId'],
      where,
      _sum: { total: true, cantidad: true },
    });

    const productoIds = byCategory.map((item) => item.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds } },
      include: { categoria: true },
    });
    const productoMap = new Map(productos.map((p) => [p.id, p]));

    const categoryMap = new Map();
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

    // 3. Ventas por Dia
    const sales = await prisma.venta.findMany({
      where,
      select: { fecha: true, total: true }
    });

    const dayMap = new Map();
    for (const sale of sales) {
      const dayStr = sale.fecha.toISOString().split('T')[0];
      const existing = dayMap.get(dayStr) || 0;
      dayMap.set(dayStr, existing + Number(sale.total));
    }

    const ventasPorDia = Array.from(dayMap.entries())
      .map(([fecha, total]) => ({ fecha, total }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    console.log("ventasPorCategoria:", JSON.stringify(ventasPorCategoria, null, 2));
    console.log("ventasPorDia:", JSON.stringify(ventasPorDia, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
