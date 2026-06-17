import bcrypt from "bcryptjs";
import { PrismaClient, RolUsuario } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the clear-db script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("🧹 Iniciando limpieza completa de la base de datos...");

  // Borrar en orden para respetar las llaves foráneas (FK constraints)
  console.log("- Borrando cierres de caja...");
  await prisma.cierreCaja.deleteMany({});

  console.log("- Borrando logs de auditoría...");
  await prisma.logAuditoria.deleteMany({});

  console.log("- Borrando ventas...");
  await prisma.venta.deleteMany({});

  console.log("- Borrando productos...");
  await prisma.producto.deleteMany({});

  console.log("- Borrando categorías...");
  await prisma.categoria.deleteMany({});

  console.log("- Borrando usuarios...");
  await prisma.usuario.deleteMany({});

  console.log("👥 Creando usuarios por defecto para poder ingresar...");

  const [adminPasswordHash, vendedorPasswordHash] = await Promise.all([
    bcrypt.hash("Admin123*", 10),
    bcrypt.hash("Vendedor123*", 10),
  ]);

  await prisma.usuario.create({
    data: {
      nombre: "Administrador",
      usuario: "admin",
      passwordHash: adminPasswordHash,
      rol: RolUsuario.ADMIN,
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: "Vendedor",
      usuario: "vendedor",
      passwordHash: vendedorPasswordHash,
      rol: RolUsuario.VENDEDOR,
    },
  });

  console.log("✨ ¡Base de datos completamente vaciada!");
  console.log("   Se han creado las credenciales iniciales:");
  console.log("   🔑 Admin:    admin / Admin123*");
  console.log("   🔑 Vendedor: vendedor / Vendedor123*");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("❌ Error al limpiar la base de datos:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
