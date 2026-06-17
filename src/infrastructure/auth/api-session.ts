import { cookies } from "next/headers";
import { prisma } from "@/infrastructure/database/prisma";
import { AUTH_COOKIE_NAME, verifySessionToken } from "./session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const session = verifySessionToken(token);

    return prisma.usuario.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        nombre: true,
        usuario: true,
        rol: true,
      },
    });
  } catch {
    return null;
  }
}

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user || user.rol !== "ADMIN") {
    return null;
  }

  return user;
}

export async function requireAuthenticatedUser() {
  return getCurrentUser();
}
