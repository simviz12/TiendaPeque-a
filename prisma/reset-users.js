const { PrismaClient } = require("../src/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Creando usuarios...");

  const adminHash = await bcrypt.hash("Admin123*", 10);
  const vendHash = await bcrypt.hash("Vendedor123*", 10);

  await prisma.usuario.upsert({
    where: { usuario: "admin" },
    update: {
      nombre: "Administrador",
      passwordHash: adminHash,
      rol: "ADMIN",
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
    create: {
      nombre: "Administrador",
      usuario: "admin",
      passwordHash: adminHash,
      rol: "ADMIN",
    },
  });

  await prisma.usuario.upsert({
    where: { usuario: "vendedor" },
    update: {
      nombre: "Vendedor",
      passwordHash: vendHash,
      rol: "VENDEDOR",
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
    create: {
      nombre: "Vendedor",
      usuario: "vendedor",
      passwordHash: vendHash,
      rol: "VENDEDOR",
    },
  });

  console.log("✅ Usuarios listos:");
  console.log("   admin     / Admin123*");
  console.log("   vendedor  / Vendedor123*");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
