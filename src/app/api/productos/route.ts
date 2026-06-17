import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { z } from "zod";

const productoSchema = z.object({
  nombre: z.string().min(1),
  categoriaId: z.string().min(1, "La categoría es obligatoria."),
  precio: z.string().regex(/^\d+(\.\d{1,2})?$/),
  costo: z.string().regex(/^\d+(\.\d{1,2})?$/),
  stock: z.number().int().min(0),
  esDePaquete: z.boolean(),
  cantidadPorPaquete: z.number().int().min(1).optional(),
  numeroDePaquetes: z.number().int().min(1).optional(),
});

export async function GET() {
  const productos = await prisma.producto.findMany({ include: { categoria: true } });
  return NextResponse.json({ success: true, data: productos });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = productoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }
  const data = parsed.data;
  let stock = data.stock;
  if (data.esDePaquete && data.cantidadPorPaquete && data.numeroDePaquetes) {
    stock = data.cantidadPorPaquete * data.numeroDePaquetes;
  }
  const producto = await prisma.producto.create({
    data: {
      nombre: data.nombre,
      categoriaId: data.categoriaId,
      precio: data.precio,
      costo: data.costo,
      stock,
      esDePaquete: data.esDePaquete,
    },
  });
  return NextResponse.json({ success: true, data: producto }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const schema = productoSchema.extend({ id: z.string() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }
  const { id, ...rest } = parsed.data;
  let stock = rest.stock;
  if (rest.esDePaquete && rest.cantidadPorPaquete && rest.numeroDePaquetes) {
    stock = rest.cantidadPorPaquete * rest.numeroDePaquetes;
  }
  const updated = await prisma.producto.update({
    where: { id },
    data: { ...rest, stock },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ success: false, error: "id requerido" }, { status: 400 });
  await prisma.producto.delete({ where: { id } });
  return NextResponse.json({ success: true, data: null });
}
