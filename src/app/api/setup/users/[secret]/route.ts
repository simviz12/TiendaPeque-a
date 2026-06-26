import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/database/prisma";

const createUserSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  usuario: z.string().trim().min(3, "El usuario debe tener al menos 3 caracteres."),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
  rol: z.enum(["ADMIN", "VENDEDOR"]),
});

function isValidSecret(secret: string) {
  const expected = process.env.SETUP_USERS_SECRET;
  return Boolean(expected && expected.length >= 40 && secret === expected);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ secret: string }> | { secret: string } },
) {
  const { secret } = await context.params;

  if (!isValidSecret(secret)) {
    return NextResponse.json(
      { success: false, error: "Enlace no autorizado." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Datos invalidos." },
      { status: 400 },
    );
  }

  const { nombre, usuario, password, rol } = parsed.data;
  const existing = await prisma.usuario.findUnique({ where: { usuario } });

  if (existing) {
    return NextResponse.json(
      { success: false, error: "Ese usuario ya existe." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.usuario.create({
    data: { nombre, usuario, passwordHash, rol },
    select: { id: true, nombre: true, usuario: true, rol: true },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
