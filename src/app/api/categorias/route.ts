import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { z } from "zod";
import { verifyJwtAndGetUser } from "@/infrastructure/auth/session";

const categoriaSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(["normal", "sensible"]),
});

export async function GET() {
  const user = await verifyJwtAndGetUser();
  if (!user) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  const categorias = await prisma.categoria.findMany();
  return NextResponse.json({ success: true, data: categorias });
}

export async function POST(request: Request) {
  const user = await verifyJwtAndGetUser();
  if (!user || user.rol !== "ADMIN") return NextResponse.json({ message: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const parsed = categoriaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }
  const cat = await prisma.categoria.create({ data: parsed.data });
  return NextResponse.json({ success: true, data: cat }, { status: 201 });
}

export async function PUT(request: Request) {
  const user = await verifyJwtAndGetUser();
  if (!user || user.rol !== "ADMIN") return NextResponse.json({ message: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const parsed = categoriaSchema.extend({ id: z.string() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 });
  }
  const { id, ...data } = parsed.data;
  const updated = await prisma.categoria.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: Request) {
  const user = await verifyJwtAndGetUser();
  if (!user || user.rol !== "ADMIN") return NextResponse.json({ message: "No autorizado" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ success: false, error: "id requerido" }, { status: 400 });
  
  try {
    await prisma.categoria.delete({ where: { id } });
    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json({ success: false, error: "No se puede borrar porque hay productos asignados a esta categoría." }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}
