import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { cookies } from 'next/headers';

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || cookieStore.get('tienda_casera_token')?.value;
  const user = token ? await verifyJwtAndGetUser(token) : null;
  if (!user || user.rol !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid query parameters' }, { status: 400 });
  }
  const { startDate, endDate } = parsed.data;

  const where: any = {};
  if (startDate && endDate) {
    where.fecha = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const ventas = await prisma.venta.findMany({
    where,
    include: { producto: true, vendedor: true },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ventas');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Producto', key: 'producto', width: 30 },
    { header: 'Vendedor', key: 'vendedor', width: 30 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Fecha', key: 'fecha', width: 20 },
  ];

  ventas.forEach((v: any) => {
    sheet.addRow({
      id: v.id,
      producto: v.producto?.nombre ?? '-',
      vendedor: v.vendedor?.nombre ?? '-',
      cantidad: v.cantidad,
      total: v.total,
      fecha: v.fecha?.toISOString(),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  headers.set('Content-Disposition', 'attachment; filename="ventas.xlsx"');

  return new Response(buffer, { status: 200, headers });
}
