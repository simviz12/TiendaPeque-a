import { PrismaClient } from "@/generated/prisma";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
  // In production we keep a single instance.
} else {
  // In development, attach to global to avoid hot‑reload issues.
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prisma = (global as any).prisma;
}

export { prisma };
