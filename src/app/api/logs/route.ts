import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/infrastructure/auth/api-session";
import { prisma } from "@/infrastructure/database/prisma";

const logsQuerySchema = z.object({
  usuarioId: z.string().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  pagina: z.coerce.number().int().positive().optional().default(1),
  limite: z.coerce.number().int().positive().max(100).optional().default(50),
});

export async function GET(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ message: "No autorizado." }, { status: 403 });

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = logsQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ message: "Parámetros inválidos." }, { status: 400 });
  }

  const { usuarioId, desde, hasta, pagina, limite } = parsed.data;

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (desde) dateFilter.gte = new Date(desde);
  if (hasta) {
    const endDate = new Date(hasta);
    endDate.setHours(23, 59, 59, 999);
    dateFilter.lte = endDate;
  }

  const where = {
    ...(usuarioId ? { usuarioId } : {}),
    ...(dateFilter.gte || dateFilter.lte ? { fecha: dateFilter } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.logAuditoria.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * limite,
      take: limite,
      include: {
        usuario: {
          select: { id: true, nombre: true, usuario: true, rol: true },
        },
      },
    }),
    prisma.logAuditoria.count({ where }),
  ]);

  return NextResponse.json({ logs, total, pagina, limite });
}
