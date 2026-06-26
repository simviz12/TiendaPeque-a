import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { cookies } from 'next/headers';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate:   z.string().optional(),
});

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token =
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    cookieStore.get('tienda_casera_token')?.value;
  const user = token ? await verifyJwtAndGetUser(token) : null;

  if (!user || user.rol !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 });
  }
  const { startDate, endDate } = parsed.data;

  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    where.fecha = {} as Record<string, Date>;
    if (startDate) (where.fecha as Record<string, Date>).gte = new Date(startDate);
    if (endDate)   (where.fecha as Record<string, Date>).lte = new Date(endDate);
  }

  // Obtener transacciones
  const transacciones = await prisma.transaccion.findMany({
    where,
    orderBy: { fecha: 'desc' },
    include: {
      vendedor: { select: { nombre: true, usuario: true } },
      ventas: {
        include: { producto: { select: { nombre: true, categoria: { select: { nombre: true } } } } },
      },
      fiado: { include: { cliente: { select: { nombre: true } } } },
    },
  });

  // ─── Calcular estadísticas ─────────────────────────────────────────────────
  const totalRecaudado = transacciones.reduce((a, t) => a + Number(t.total), 0);
  const totalTransacciones = transacciones.length;
  const totalEfectivo = transacciones.reduce((a, t) => a + Number(t.pagoEfectivo), 0);
  const totalNequi = transacciones.reduce((a, t) => a + Number(t.pagoNequi), 0);
  const totalBancolombia = transacciones.reduce((a, t) => a + Number(t.pagoBancolombia), 0);
  const totalFiado = transacciones.reduce((a, t) => a + Number(t.pagoFiado), 0);
  const ticketPromedio = totalTransacciones > 0 ? totalRecaudado / totalTransacciones : 0;

  // Productos más vendidos
  const productMap = new Map<string, { nombre: string; categoria: string; cantidad: number; total: number }>();
  for (const t of transacciones) {
    for (const item of t.ventas) {
      const key = item.producto.nombre;
      const existing = productMap.get(key);
      if (existing) {
        existing.cantidad += item.cantidad;
        existing.total += Number(item.total);
      } else {
        productMap.set(key, {
          nombre: item.producto.nombre,
          categoria: item.producto.categoria?.nombre ?? '-',
          cantidad: item.cantidad,
          total: Number(item.total),
        });
      }
    }
  }
  const topProductos = [...productMap.values()].sort((a, b) => b.total - a.total).slice(0, 20);

  // Ventas por vendedor
  const vendedorMap = new Map<string, { nombre: string; transacciones: number; total: number }>();
  for (const t of transacciones) {
    const nombre = t.vendedor?.nombre ?? 'Desconocido';
    const ex = vendedorMap.get(nombre);
    if (ex) { ex.transacciones++; ex.total += Number(t.total); }
    else vendedorMap.set(nombre, { nombre, transacciones: 1, total: Number(t.total) });
  }
  const vendedores = [...vendedorMap.values()].sort((a, b) => b.total - a.total);

  // ─── Crear workbook ────────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tienda Casera';
  workbook.created = new Date();

  const periodoLabel = startDate && endDate
    ? `${fmtDate(new Date(startDate))} — ${fmtDate(new Date(endDate))}`
    : startDate ? `Desde ${fmtDate(new Date(startDate))}`
    : endDate ? `Hasta ${fmtDate(new Date(endDate))}`
    : 'Todo el historial';

  // ─── HOJA 1: Resumen ──────────────────────────────────────────────────────
  const resumen = workbook.addWorksheet('📊 Resumen');
  resumen.columns = [{ width: 35 }, { width: 25 }];

  const titleRow = resumen.addRow(['RESUMEN DE VENTAS', '']);
  titleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  titleRow.alignment = { horizontal: 'center' };
  resumen.mergeCells('A1:B1');

  resumen.addRow(['Período', periodoLabel]).font = { bold: true };
  resumen.addRow(['Generado el', fmtDate(new Date())]).font = { italic: true, color: { argb: 'FF666666' } };
  resumen.addRow([]);

  const statsHeader = resumen.addRow(['ESTADÍSTICAS GENERALES', '']);
  statsHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  statsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  resumen.mergeCells(`A${statsHeader.number}:B${statsHeader.number}`);

  const statsRows = [
    ['Total Recaudado', fmt(totalRecaudado)],
    ['Número de Transacciones', totalTransacciones.toString()],
    ['Ticket Promedio', fmt(ticketPromedio)],
    ['', ''],
    ['Desglose por Método de Pago', ''],
    ['💵 Efectivo', fmt(totalEfectivo)],
    ['📱 Nequi', fmt(totalNequi)],
    ['🏦 Bancolombia', fmt(totalBancolombia)],
    ['📒 Fiado', fmt(totalFiado)],
  ];

  for (const [label, value] of statsRows) {
    const row = resumen.addRow([label, value]);
    if (label === 'Desglose por Método de Pago') {
      row.font = { bold: true, color: { argb: 'FF1E3A5F' } };
    } else if (label === 'Total Recaudado') {
      row.font = { bold: true, size: 12 };
      row.getCell(2).font = { bold: true, size: 12, color: { argb: 'FF16A34A' } };
    }
  }

  // Vendedores
  resumen.addRow([]);
  const vendH = resumen.addRow(['VENTAS POR VENDEDOR', '']);
  vendH.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  vendH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
  resumen.mergeCells(`A${vendH.number}:B${vendH.number}`);
  const vendHeader = resumen.addRow(['Vendedor', 'Total Vendido']);
  vendHeader.font = { bold: true };
  for (const v of vendedores) {
    resumen.addRow([v.nombre, fmt(v.total)]);
  }

  // ─── HOJA 2: Transacciones ────────────────────────────────────────────────
  const sheet = workbook.addWorksheet('📋 Transacciones');
  sheet.columns = [
    { header: 'Fecha',        key: 'fecha',          width: 22 },
    { header: 'Vendedor',     key: 'vendedor',        width: 22 },
    { header: 'Producto',     key: 'producto',        width: 28 },
    { header: 'Categoría',    key: 'categoria',       width: 18 },
    { header: 'Cantidad',     key: 'cantidad',        width: 10 },
    { header: 'Precio Unit.', key: 'precioUnitario',  width: 15 },
    { header: 'Subtotal',     key: 'subtotal',        width: 15 },
    { header: 'Efectivo',     key: 'efectivo',        width: 14 },
    { header: 'Nequi',        key: 'nequi',           width: 14 },
    { header: 'Bancolombia',  key: 'bancolombia',     width: 14 },
    { header: 'Fiado',        key: 'fiado',           width: 14 },
    { header: 'Total Orden',  key: 'totalOrden',      width: 15 },
    { header: 'Cliente Fiado',key: 'clienteFiado',    width: 20 },
  ];

  // Estilo encabezado
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  headerRow.alignment = { horizontal: 'center' };

  let rowIdx = 2;
  for (const t of transacciones) {
    for (const item of t.ventas) {
      sheet.addRow({
        fecha:          fmtDate(t.fecha),
        vendedor:       t.vendedor?.nombre ?? '-',
        producto:       item.producto?.nombre ?? '-',
        categoria:      item.producto?.categoria?.nombre ?? '-',
        cantidad:       item.cantidad,
        precioUnitario: Number(item.precioUnitario),
        subtotal:       Number(item.total),
        efectivo:       Number(t.pagoEfectivo),
        nequi:          Number(t.pagoNequi),
        bancolombia:    Number(t.pagoBancolombia),
        fiado:          Number(t.pagoFiado),
        totalOrden:     Number(t.total),
        clienteFiado:   t.fiado?.cliente?.nombre ?? '',
      });
      rowIdx++;
    }
  }

  // Fila de totales
  sheet.addRow([]);
  const totalRow = sheet.addRow({
    fecha: 'TOTALES',
    vendedor: '',
    producto: '',
    categoria: '',
    cantidad: '',
    precioUnitario: '',
    subtotal: totalRecaudado,
    efectivo: totalEfectivo,
    nequi: totalNequi,
    bancolombia: totalBancolombia,
    fiado: totalFiado,
    totalOrden: totalRecaudado,
    clienteFiado: '',
  });
  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };

  // ─── HOJA 3: Top Productos ────────────────────────────────────────────────
  const topSheet = workbook.addWorksheet('🏆 Top Productos');
  topSheet.columns = [
    { header: 'Producto',   key: 'nombre',    width: 30 },
    { header: 'Categoría',  key: 'categoria', width: 20 },
    { header: 'Unidades Vendidas', key: 'cantidad', width: 18 },
    { header: 'Total Vendido',     key: 'total',    width: 18 },
  ];
  topSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  topSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };

  for (const p of topProductos) {
    topSheet.addRow({ nombre: p.nombre, categoria: p.categoria, cantidad: p.cantidad, total: p.total });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `ventas_${startDate ? startDate.slice(0, 10) : 'todo'}_${endDate ? endDate.slice(0, 10) : 'hoy'}.xlsx`;
  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);

  return new Response(buffer, { status: 200, headers });
}
