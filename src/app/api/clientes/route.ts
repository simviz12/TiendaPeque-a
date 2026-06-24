import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJwtAndGetUser } from '@/infrastructure/auth/session';
import { z } from 'zod';

const clienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio.'),
  telefono: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await verifyJwtAndGetUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado.' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search');

  try {
    const clientes = await prisma.cliente.findMany({
      where: search ? {
        nombre: {
          contains: search,
          mode: 'insensitive',
        }
      } : undefined,
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({ success: true, data: clientes });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al obtener clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await verifyJwtAndGetUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado.' },
      { status: 401 },
    );
  }

  const body = await request.json();
  const parsed = clienteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos.' },
      { status: 400 },
    );
  }

  try {
    // Buscar si ya existe por nombre
    const existing = await prisma.cliente.findUnique({
      where: { nombre: parsed.data.nombre }
    });

    if (existing) {
      return NextResponse.json({ success: true, data: existing }, { status: 200 });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: parsed.data.nombre,
        telefono: parsed.data.telefono,
      }
    });

    return NextResponse.json({ success: true, data: cliente }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al crear cliente' },
      { status: 500 }
    );
  }
}
