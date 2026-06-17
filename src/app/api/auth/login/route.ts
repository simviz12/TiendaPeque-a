import bcrypt from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { AUTH_COOKIE_NAME, createSessionToken } from "@/infrastructure/auth/session";

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 5;

const loginSchema = z.object({
  usuario: z.string().min(1, "El usuario es obligatorio.").trim(),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.errors[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const { usuario, password } = parsed.data;

    const user = await prisma.usuario.findUnique({
      where: { usuario },
      select: {
        id: true,
        nombre: true,
        usuario: true,
        passwordHash: true,
        rol: true,
        intentosFallidos: true,
        bloqueadoHasta: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos." },
        { status: 401 },
      );
    }

    // Verificar si el usuario está bloqueado
    if (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) {
      const minutosRestantes = Math.ceil(
        (user.bloqueadoHasta.getTime() - Date.now()) / 60000,
      );
      return NextResponse.json(
        {
          message: `Cuenta bloqueada por ${minutosRestantes} minuto(s) debido a múltiples intentos fallidos.`,
        },
        { status: 429 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const nuevoContador = user.intentosFallidos + 1;
      const bloqueado = nuevoContador >= MAX_INTENTOS;

      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          intentosFallidos: nuevoContador,
          bloqueadoHasta: bloqueado
            ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000)
            : null,
        },
      });

      const intentosRestantes = MAX_INTENTOS - nuevoContador;
      return NextResponse.json(
        {
          message: bloqueado
            ? `Demasiados intentos fallidos. Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos.`
            : `Usuario o contraseña incorrectos. Te quedan ${intentosRestantes} intento(s).`,
        },
        { status: bloqueado ? 429 : 401 },
      );
    }

    // Login exitoso — resetear contador
    await prisma.usuario.update({
      where: { id: user.id },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    });

    const token = createSessionToken({ id: user.id, rol: user.rol });
    const response = NextResponse.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}
