import bcrypt from "bcryptjs";
import { PrismaClient, RolUsuario } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Creando usuarios...");

  const [adminHash, vendedorHash] = await Promise.all([
    bcrypt.hash("Admin123*", 10),
    bcrypt.hash("Vendedor123*", 10),
  ]);

  const admin = await prisma.usuario.upsert({
    where: { usuario: "admin" },
    update: { nombre: "Administrador", passwordHash: adminHash, rol: RolUsuario.ADMIN, intentosFallidos: 0, bloqueadoHasta: null },
    create: { nombre: "Administrador", usuario: "admin", passwordHash: adminHash, rol: RolUsuario.ADMIN },
  });

  const vendedor = await prisma.usuario.upsert({
    where: { usuario: "vendedor" },
    update: { nombre: "Vendedor", passwordHash: vendedorHash, rol: RolUsuario.VENDEDOR, intentosFallidos: 0, bloqueadoHasta: null },
    create: { nombre: "Vendedor", usuario: "vendedor", passwordHash: vendedorHash, rol: RolUsuario.VENDEDOR },
  });

  console.log("✅ Usuarios creados/actualizados:");
  console.log(`   Admin:    ${admin.usuario} / Admin123*`);
  console.log(`   Vendedor: ${vendedor.usuario} / Vendedor123*`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
