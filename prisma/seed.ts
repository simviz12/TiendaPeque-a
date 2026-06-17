import bcrypt from "bcryptjs";
import { PrismaClient, RolUsuario, TipoCategoria } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const categorias = [
  { nombre: "Licores", tipo: TipoCategoria.sensible },
  { nombre: "Cigarrillos", tipo: TipoCategoria.sensible },
  { nombre: "Alimentos y dulces", tipo: TipoCategoria.normal },
  { nombre: "Huevos y lacteos", tipo: TipoCategoria.normal },
  { nombre: "Otros", tipo: TipoCategoria.normal },
] as const;

const productos = [
  { nombre: "Cerveza lata 330 ml", categoria: "Licores", precio: "3500", costo: "2600", stock: 48, esDePaquete: false },
  { nombre: "Aguardiente media botella", categoria: "Licores", precio: "22000", costo: "17500", stock: 12, esDePaquete: false },
  { nombre: "Ron botella 375 ml", categoria: "Licores", precio: "28000", costo: "21500", stock: 8, esDePaquete: false },
  { nombre: "Cigarrillo unidad", categoria: "Cigarrillos", precio: "1000", costo: "700", stock: 120, esDePaquete: false },
  { nombre: "Paquete cigarrillos", categoria: "Cigarrillos", precio: "18000", costo: "14500", stock: 20, esDePaquete: true },
  { nombre: "Galletas de chocolate", categoria: "Alimentos y dulces", precio: "2500", costo: "1700", stock: 35, esDePaquete: false },
  { nombre: "Chocolatina", categoria: "Alimentos y dulces", precio: "2000", costo: "1300", stock: 40, esDePaquete: false },
  { nombre: "Papas paquete pequeno", categoria: "Alimentos y dulces", precio: "2800", costo: "1900", stock: 32, esDePaquete: false },
  { nombre: "Pan tajado", categoria: "Alimentos y dulces", precio: "6500", costo: "5000", stock: 10, esDePaquete: false },
  { nombre: "Huevos cubeta x30", categoria: "Huevos y lacteos", precio: "18000", costo: "14500", stock: 10, esDePaquete: true },
  { nombre: "Huevo unidad", categoria: "Huevos y lacteos", precio: "700", costo: "480", stock: 90, esDePaquete: false },
  { nombre: "Leche bolsa 1 litro", categoria: "Huevos y lacteos", precio: "4200", costo: "3400", stock: 24, esDePaquete: false },
  { nombre: "Queso campesino 250 g", categoria: "Huevos y lacteos", precio: "8500", costo: "6700", stock: 9, esDePaquete: false },
  { nombre: "Encendedor", categoria: "Otros", precio: "2500", costo: "1600", stock: 18, esDePaquete: false },
  { nombre: "Bolsa basura pequena", categoria: "Otros", precio: "500", costo: "250", stock: 100, esDePaquete: false },
] as const;

// Pesos de venta realista por producto (probabilidad relativa)
const PESOS_VENTA: Record<string, number> = {
  "Cerveza lata 330 ml": 18,
  "Aguardiente media botella": 6,
  "Ron botella 375 ml": 4,
  "Cigarrillo unidad": 25,
  "Paquete cigarrillos": 8,
  "Galletas de chocolate": 12,
  "Chocolatina": 14,
  "Papas paquete pequeno": 10,
  "Pan tajado": 7,
  "Huevos cubeta x30": 5,
  "Huevo unidad": 15,
  "Leche bolsa 1 litro": 9,
  "Queso campesino 250 g": 4,
  "Encendedor": 3,
  "Bolsa basura pequena": 6,
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Selecciona un producto aleatoriamente según pesos
function elegirProducto(pesosMap: Map<string, number>, productosIds: string[]) {
  const totalPeso = Array.from(pesosMap.values()).reduce((a, b) => a + b, 0);
  let rnd = Math.random() * totalPeso;
  for (const id of productosIds) {
    const peso = pesosMap.get(id) ?? 1;
    rnd -= peso;
    if (rnd <= 0) return id;
  }
  return productosIds[productosIds.length - 1];
}

async function main() {
  console.log("🌱 Iniciando seed...");

  const [adminPasswordHash, vendedorPasswordHash] = await Promise.all([
    bcrypt.hash("Admin123*", 10),
    bcrypt.hash("Vendedor123*", 10),
  ]);

  const adminUser = await prisma.usuario.upsert({
    where: { usuario: "admin" },
    update: { nombre: "Administrador", passwordHash: adminPasswordHash, rol: RolUsuario.ADMIN },
    create: { nombre: "Administrador", usuario: "admin", passwordHash: adminPasswordHash, rol: RolUsuario.ADMIN },
  });

  const vendedorUser = await prisma.usuario.upsert({
    where: { usuario: "vendedor" },
    update: { nombre: "Vendedor", passwordHash: vendedorPasswordHash, rol: RolUsuario.VENDEDOR },
    create: { nombre: "Vendedor", usuario: "vendedor", passwordHash: vendedorPasswordHash, rol: RolUsuario.VENDEDOR },
  });

  for (const categoria of categorias) {
    await prisma.categoria.upsert({
      where: { nombre: categoria.nombre },
      update: { tipo: categoria.tipo },
      create: categoria,
    });
  }

  const categoriasGuardadas = await prisma.categoria.findMany();
  const categoriaPorNombre = new Map(categoriasGuardadas.map((c) => [c.nombre, c.id]));

  const productosGuardados: { id: string; nombre: string; precio: string }[] = [];

  for (const producto of productos) {
    const categoriaId = categoriaPorNombre.get(producto.categoria);
    if (!categoriaId) throw new Error(`No se encontró la categoría ${producto.categoria}.`);

    const p = await prisma.producto.upsert({
      where: { nombre: producto.nombre },
      update: { categoriaId, precio: producto.precio, costo: producto.costo, stock: producto.stock, esDePaquete: producto.esDePaquete },
      create: { nombre: producto.nombre, categoriaId, precio: producto.precio, costo: producto.costo, stock: producto.stock, esDePaquete: producto.esDePaquete },
    });
    productosGuardados.push({ id: p.id, nombre: p.nombre, precio: p.precio.toString() });
  }

  console.log("✅ Usuarios, categorías y productos creados.");

  // --- GENERAR 60 DÍAS DE VENTAS SIMULADAS ---
  console.log("📊 Generando 60 días de ventas simuladas...");

  // Eliminar ventas previas del seed para no duplicar
  await prisma.venta.deleteMany({});
  await prisma.logAuditoria.deleteMany({});

  const productosIds = productosGuardados.map((p) => p.id);
  const pesosMap = new Map<string, number>(
    productosGuardados.map((p) => [p.id, PESOS_VENTA[p.nombre] ?? 5])
  );
  const vendedores = [adminUser.id, vendedorUser.id];

  const hoy = new Date();
  const ventasParaInsertar: {
    productoId: string;
    vendedorId: string;
    cantidad: number;
    total: string;
    fecha: Date;
  }[] = [];

  for (let dia = 60; dia >= 0; dia--) {
    const fechaDia = new Date(hoy);
    fechaDia.setDate(hoy.getDate() - dia);

    // Los fines de semana venden más (1.5x), entre semana normal
    const esFinde = fechaDia.getDay() === 0 || fechaDia.getDay() === 6;
    // Tendencia creciente: los últimos 30 días venden ~20% más que los primeros 30
    const factorTendencia = dia > 30 ? 1.0 : 1.2;
    const ventasPorDia = Math.round((esFinde ? randInt(18, 35) : randInt(10, 22)) * factorTendencia);

    for (let v = 0; v < ventasPorDia; v++) {
      const productoId = elegirProducto(pesosMap, productosIds);
      const producto = productosGuardados.find((p) => p.id === productoId)!;
      const cantidad = randInt(1, 4);
      const total = (parseFloat(producto.precio) * cantidad).toFixed(2);
      const vendedorId = vendedores[Math.random() < 0.7 ? 1 : 0]; // 70% vendedor, 30% admin

      // Hora aleatoria del día (7am - 9pm)
      const hora = randInt(7, 21);
      const minuto = randInt(0, 59);
      const fecha = new Date(fechaDia);
      fecha.setHours(hora, minuto, 0, 0);

      ventasParaInsertar.push({ productoId, vendedorId, cantidad, total, fecha });
    }
  }

  // Insertar en lotes de 100 para eficiencia
  const BATCH = 100;
  for (let i = 0; i < ventasParaInsertar.length; i += BATCH) {
    const lote = ventasParaInsertar.slice(i, i + BATCH);
    await prisma.venta.createMany({ data: lote });
  }

  console.log(`✅ ${ventasParaInsertar.length} ventas simuladas generadas para los últimos 60 días.`);
  console.log("\n🎉 Seed completado exitosamente.");
  console.log("   Admin:    admin / Admin123*");
  console.log("   Vendedor: vendedor / Vendedor123*");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
