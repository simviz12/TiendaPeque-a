const { PrismaClient } = require("../src/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Limpiando TODA la base de datos...\n");

  // Borrar en orden para respetar llaves foráneas
  const cierres = await prisma.cierreCaja.deleteMany({});
  console.log(`✅ Cierres de caja borrados: ${cierres.count}`);

  const logs = await prisma.logAuditoria.deleteMany({});
  console.log(`✅ Logs de auditoría borrados: ${logs.count}`);

  const ventas = await prisma.venta.deleteMany({});
  console.log(`✅ Ventas borradas: ${ventas.count}`);

  const productos = await prisma.producto.deleteMany({});
  console.log(`✅ Productos borrados: ${productos.count}`);

  const categorias = await prisma.categoria.deleteMany({});
  console.log(`✅ Categorías borradas: ${categorias.count}`);

  const usuarios = await prisma.usuario.deleteMany({});
  console.log(`✅ Usuarios borrados: ${usuarios.count}`);

  console.log("\n👥 Creando usuarios iniciales para ingresar al sistema...");

  const adminHash = await bcrypt.hash("Admin123*", 10);
  const vendHash = await bcrypt.hash("Vendedor123*", 10);

  await prisma.usuario.create({
    data: {
      nombre: "Administrador",
      usuario: "admin",
      passwordHash: adminHash,
      rol: "ADMIN",
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: "Vendedor",
      usuario: "vendedor",
      passwordHash: vendHash,
      rol: "VENDEDOR",
    },
  });

  console.log("\n🎉 ¡Base de datos limpia y lista para la tienda real!");
  console.log("   🔑 Admin:    usuario=admin    clave=Admin123*");
  console.log("   🔑 Vendedor: usuario=vendedor clave=Vendedor123*");
  console.log("\n⚠️  Recuerda agregar tus propios productos e inventario desde el Panel de Admin.");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
