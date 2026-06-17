import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import {
  AUTH_COOKIE_NAME,
  verifySessionToken,
} from "@/infrastructure/auth/session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ message: "No hay sesion activa." }, { status: 401 });
  }

  try {
    const session = verifySessionToken(token);
    const user = await prisma.usuario.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        nombre: true,
        usuario: true,
        rol: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "La sesion ya no es valida." },
        { status: 401 },
      );
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ message: "Token invalido." }, { status: 401 });
  }
}
