import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "../database/prisma";

export const AUTH_COOKIE_NAME = "tienda_casera_token";

export type SessionPayload = {
  id: string;
  rol: "ADMIN" | "VENDEDOR";
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required for authentication.");
  }

  return secret;
}

export function createSessionToken(payload: SessionPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "8h",
  });
}

export function verifySessionToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as SessionPayload;
}

export async function verifyJwtAndGetUser(token?: string) {
  try {
    let actualToken = token;
    if (!actualToken) {
      const cookieStore = await cookies();
      actualToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    }
    if (!actualToken) return null;
    const payload = verifySessionToken(actualToken);
    if (!payload || !payload.id) return null;
    return await prisma.usuario.findUnique({
      where: { id: payload.id },
    });
  } catch (error) {
    console.error("Error in verifyJwtAndGetUser:", error);
    return null;
  }
}
