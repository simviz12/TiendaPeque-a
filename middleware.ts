import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "tienda_casera_token";

type SessionPayload = {
  id: string;
  rol: "ADMIN" | "VENDEDOR";
  exp?: number;
};

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function verifyJwt(token: string, secret: string) {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature),
    new TextEncoder().encode(`${header}.${payload}`),
  );

  if (!isValid) {
    return null;
  }

  const decoded = JSON.parse(
    new TextDecoder().decode(base64UrlToBytes(payload)),
  ) as SessionPayload;

  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    return null;
  }

  return decoded;
}

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = process.env.JWT_SECRET;

  if (pathname === "/login") {
    if (token && secret) {
      const session = await verifyJwt(token, secret);
      if (session) {
        return NextResponse.redirect(new URL(session.rol === "ADMIN" ? "/admin" : "/vendedor", request.url));
      }
    }
    return NextResponse.next();
  }

  if (!token || !secret) {
    return redirectToLogin(request);
  }

  const session = await verifyJwt(token, secret);

  if (!session) {
    return redirectToLogin(request);
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(session.rol === "ADMIN" ? "/admin" : "/vendedor", request.url));
  }

  if (pathname.startsWith("/admin") && session.rol !== "ADMIN") {
    return NextResponse.redirect(new URL("/vendedor", request.url));
  }

  if (pathname.startsWith("/vendedor") && session.rol !== "VENDEDOR") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const response = NextResponse.next();

  // Add Anti-Caching headers for protected routes to prevent back-button bfcache
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  
  return response;
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/vendedor/:path*"],
};
