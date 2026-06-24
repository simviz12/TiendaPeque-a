import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';

export async function GET(request: Request) {
  const user = await verifyJwtAndGetUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado. Por favor inicia sesión.' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const { estado, search } = Object.fromEntries(url.searchParams.entries());
  const where: Record<string, unknown> = {};

  if (estado) {
    where.estado = estado;
  }

  if (search) {
    where.cliente = {
      nombre: {
        contains: search,
        mode: 'insensitive',
      }
    };
  }

  try {
    const fiados = await prisma.fiado.findMany({
      where,
      orderBy: { fechaCreacion: 'desc' },
      include: {
        cliente: true,
        transaccion: {
          include: {
            ventas: {
              include: { producto: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: fiados });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al obtener fiados' },
      { status: 500 }
    );
  }
}
