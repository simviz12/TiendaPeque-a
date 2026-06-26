import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { z } from 'zod';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';

const abonoSchema = z.object({
  monto: z.number().positive('El monto debe ser mayor a 0.'),
  metodoPago: z.enum(['EFECTIVO', 'NEQUI', 'BANCOLOMBIA']).default('EFECTIVO'),
  notas: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const user = await verifyJwtAndGetUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado. Por favor inicia sesión.' },
      { status: 401 },
    );
  }

  const resolvedParams = await context.params;
  const { id } = resolvedParams;
  const body = await request.json();
  const parsed = abonoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos.' },
      { status: 400 },
    );
  }

  const { monto, metodoPago, notas } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const fiado = await tx.fiado.findUnique({
        where: { id },
        include: { cliente: true }
      });

      if (!fiado) {
        throw new Error('Fiado no encontrado.');
      }

      if (fiado.estado === 'PAGADO_TOTAL') {
        throw new Error('Este fiado ya está pagado en su totalidad.');
      }

      const nuevoMontoPagado = Number(fiado.montoPagado) + monto;
      let nuevoEstado: any = fiado.estado;

      if (nuevoMontoPagado >= Number(fiado.montoTotal)) {
        nuevoEstado = 'PAGADO_TOTAL';
      } else if (nuevoMontoPagado > 0) {
        nuevoEstado = 'PAGADO_PARCIAL';
      }

      const updatedFiado = await tx.fiado.update({
        where: { id },
        data: {
          montoPagado: nuevoMontoPagado,
          estado: nuevoEstado,
        },
      });

      // Registrar el ingreso en caja creando una transacción de abono
      await tx.transaccion.create({
        data: {
          vendedorId: user.id,
          total: 0, // No suma a las ventas brutas
          pagoEfectivo: metodoPago === 'EFECTIVO' ? monto : 0,
          pagoNequi: metodoPago === 'NEQUI' ? monto : 0,
          pagoBancolombia: metodoPago === 'BANCOLOMBIA' ? monto : 0,
          pagoFiado: -monto, // Resta de la deuda en los totales del sistema
          fecha: new Date(),
        },
      });

      await tx.logAuditoria.create({
        data: {
          usuarioId: user.id,
          accion: `Abono a Fiado (${fiado.cliente.nombre}): ${monto} en ${metodoPago} — Estado: ${nuevoEstado}`,
          fecha: new Date(),
        },
      });

      return updatedFiado;
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al registrar el abono.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
