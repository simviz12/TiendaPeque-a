import { NextResponse } from "next/server";
import { TipoCategoria } from "@/generated/prisma";
import { requireAdminUser } from "@/infrastructure/auth/api-session";
import { prisma } from "@/infrastructure/database/prisma";

function isValidTipo(value: unknown): value is TipoCategoria {
  return value === TipoCategoria.normal || value === TipoCategoria.sensible;
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, { params }: RouteContext) {
  const admin = await requireAdminUser();

  if (!admin) {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    nombre?: string;
    tipo?: string;
  };
  const nombre = body.nombre?.trim();

  if (!nombre || !isValidTipo(body.tipo)) {
    return NextResponse.json(
      { message: "Nombre y tipo valido son obligatorios." },
      { status: 400 },
    );
  }

  try {
    const categoria = await prisma.categoria.update({
      where: { id },
      data: {
        nombre,
        tipo: body.tipo,
      },
    });

    return NextResponse.json({ categoria });
  } catch {
    return NextResponse.json(
      { message: "No se pudo actualizar la categoria." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const admin = await requireAdminUser();

  if (!admin) {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const productsCount = await prisma.producto.count({
    where: { categoriaId: id },
  });

  if (productsCount > 0) {
    return NextResponse.json(
      { message: "No se puede eliminar una categoria con productos." },
      { status: 409 },
    );
  }

  try {
    await prisma.categoria.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "No se pudo eliminar la categoria." },
      { status: 400 },
    );
  }
}
