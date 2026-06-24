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
  if (startDate && endDate) {
    where.fecha = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  // Obtener Transacciones con sus ítems
  const transacciones = await prisma.transaccion.findMany({
    where,
    orderBy: { fecha: 'desc' },
    include: {
      vendedor: { select: { nombre: true } },
      ventas: {
        include: { producto: { select: { nombre: true } } },
      },
    },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ventas');

  sheet.columns = [
    { header: 'ID Transacción', key: 'transaccionId',   width: 20 },
    { header: 'Fecha',          key: 'fecha',            width: 22 },
    { header: 'Vendedor',       key: 'vendedor',         width: 25 },
    { header: 'Producto',       key: 'producto',         width: 30 },
    { header: 'Cantidad',       key: 'cantidad',         width: 10 },
    { header: 'Precio Unit.',   key: 'precioUnitario',   width: 15 },
    { header: 'Subtotal',       key: 'subtotal',         width: 15 },
    { header: 'Efectivo',       key: 'efectivo',         width: 15 },
    { header: 'Nequi',          key: 'nequi',            width: 15 },
    { header: 'Bancolombia',    key: 'bancolombia',      width: 15 },
    { header: 'Fiado',          key: 'fiado',            width: 15 },
    { header: 'Total Orden',    key: 'totalOrden',       width: 15 },
  ];

  // Una fila por ítem dentro de la transacción
  for (const t of transacciones) {
    for (const item of t.ventas) {
      sheet.addRow({
        transaccionId: t.id,
        fecha:         t.fecha?.toISOString() ?? '',
        vendedor:      t.vendedor?.nombre ?? '-',
        producto:      item.producto?.nombre ?? '-',
        cantidad:      item.cantidad,
        precioUnitario: Number(item.precioUnitario),
        subtotal:      Number(item.total),
        efectivo:      Number(t.pagoEfectivo),
        nequi:         Number(t.pagoNequi),
        bancolombia:   Number(t.pagoBancolombia),
        fiado:         Number(t.pagoFiado),
        totalOrden:    Number(t.total),
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const headers = new Headers();
  headers.set(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  headers.set('Content-Disposition', 'attachment; filename="ventas.xlsx"');

  return new Response(buffer, { status: 200, headers });
}
