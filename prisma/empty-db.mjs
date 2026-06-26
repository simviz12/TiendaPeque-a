import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando toda la base de datos...");

  const cierres = await prisma.cierreCaja.deleteMany({});
  const fiados = await prisma.fiado.deleteMany({});
  const clientes = await prisma.cliente.deleteMany({});
  const logs = await prisma.logAuditoria.deleteMany({});
  const ventas = await prisma.venta.deleteMany({});
  const transacciones = await prisma.transaccion.deleteMany({});
  const productos = await prisma.producto.deleteMany({});
  const categorias = await prisma.categoria.deleteMany({});
  const usuarios = await prisma.usuario.deleteMany({});

  console.log(`Cierres de caja borrados: ${cierres.count}`);
  console.log(`Fiados borrados: ${fiados.count}`);
  console.log(`Clientes borrados: ${clientes.count}`);
  console.log(`Logs borrados: ${logs.count}`);
  console.log(`Ventas borradas: ${ventas.count}`);
  console.log(`Transacciones borradas: ${transacciones.count}`);
  console.log(`Productos borrados: ${productos.count}`);
  console.log(`Categorias borradas: ${categorias.count}`);
  console.log(`Usuarios borrados: ${usuarios.count}`);
  console.log("Base de datos vacia. No se crearon usuarios.");
}

main()
  .catch((error) => {
    console.error("Error limpiando la base de datos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
