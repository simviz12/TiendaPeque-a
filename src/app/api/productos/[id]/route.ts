import { NextResponse } from "next/server";
import { requireAdminUser } from "@/infrastructure/auth/api-session";
import { prisma } from "@/infrastructure/database/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ProductPayload = {
  nombre?: string;
  categoriaId?: string;
  precio?: string | number;
  costo?: string | number;
  stock?: string | number;
  esDePaquete?: boolean;
  cantidadPorPaquete?: string | number;
  numeroDePaquetes?: string | number;
};

function toPositiveMoney(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue.toFixed(2);
}

function toNonNegativeInteger(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue;
}

function resolveStock(body: ProductPayload) {
  const cantidadPorPaquete = toNonNegativeInteger(body.cantidadPorPaquete);
  const numeroDePaquetes = toNonNegativeInteger(body.numeroDePaquetes);

  if (cantidadPorPaquete !== null && numeroDePaquetes !== null) {
    return {
      stock: cantidadPorPaquete * numeroDePaquetes,
      esDePaquete: true,
    };
  }

  return {
    stock: toNonNegativeInteger(body.stock) ?? 0,
    esDePaquete: Boolean(body.esDePaquete),
  };
}

export async function PUT(request: Request, { params }: RouteContext) {
  const admin = await requireAdminUser();

  if (!admin) {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as ProductPayload;
  const nombre = body.nombre?.trim();
  const precio = toPositiveMoney(body.precio);
  const costo = toPositiveMoney(body.costo);
  const categoriaId = body.categoriaId?.trim();
  const stockResult = resolveStock(body);

  if (!nombre || !categoriaId || precio === null || costo === null) {
    return NextResponse.json(
      { message: "Nombre, categoria, precio y costo son obligatorios." },
      { status: 400 },
    );
  }

  try {
    const producto = await prisma.producto.update({
      where: { id },
      data: {
        nombre,
        categoriaId,
        precio,
        costo,
        stock: stockResult.stock,
        esDePaquete: stockResult.esDePaquete,
      },
      include: {
        categoria: true,
      },
    });

    return NextResponse.json({ producto });
  } catch {
    return NextResponse.json(
      { message: "No se pudo actualizar el producto." },
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
  try {
    await prisma.producto.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "No se pudo eliminar el producto." },
      { status: 400 },
    );
  }
}
