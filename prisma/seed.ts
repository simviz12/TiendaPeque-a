import bcrypt from "bcryptjs";
import { PrismaClient, RolUsuario, TipoCategoria, EstadoFiado } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

const categorias = [
  { nombre: "Licores", tipo: TipoCategoria.sensible },
  { nombre: "Cigarrillos", tipo: TipoCategoria.sensible },
  { nombre: "Alimentos y dulces", tipo: TipoCategoria.normal },
  { nombre: "Huevos y lacteos", tipo: TipoCategoria.normal },
  { nombre: "Otros", tipo: TipoCategoria.normal },
];

const productos = [
  { nombre: "Cerveza lata 330 ml", categoria: "Licores", precio: 3500, costo: 2600, stock: 48, esDePaquete: false },
  { nombre: "Aguardiente media botella", categoria: "Licores", precio: 22000, costo: 17500, stock: 12, esDePaquete: false },
  { nombre: "Ron botella 375 ml", categoria: "Licores", precio: 28000, costo: 21500, stock: 8, esDePaquete: false },
  { nombre: "Cigarrillo unidad", categoria: "Cigarrillos", precio: 1000, costo: 700, stock: 120, esDePaquete: false },
  { nombre: "Paquete cigarrillos", categoria: "Cigarrillos", precio: 18000, costo: 14500, stock: 20, esDePaquete: true },
  { nombre: "Galletas de chocolate", categoria: "Alimentos y dulces", precio: 2500, costo: 1700, stock: 35, esDePaquete: false },
  { nombre: "Chocolatina", categoria: "Alimentos y dulces", precio: 2000, costo: 1300, stock: 40, esDePaquete: false },
  { nombre: "Papas paquete pequeno", categoria: "Alimentos y dulces", precio: 2800, costo: 1900, stock: 32, esDePaquete: false },
  { nombre: "Pan tajado", categoria: "Alimentos y dulces", precio: 6500, costo: 5000, stock: 10, esDePaquete: false },
  { nombre: "Huevos cubeta x30", categoria: "Huevos y lacteos", precio: 18000, costo: 14500, stock: 10, esDePaquete: true },
  { nombre: "Huevo unidad", categoria: "Huevos y lacteos", precio: 700, costo: 480, stock: 90, esDePaquete: false },
  { nombre: "Leche bolsa 1 litro", categoria: "Huevos y lacteos", precio: 4200, costo: 3400, stock: 24, esDePaquete: false },
  { nombre: "Queso campesino 250 g", categoria: "Huevos y lacteos", precio: 8500, costo: 6700, stock: 9, esDePaquete: false },
  { nombre: "Encendedor", categoria: "Otros", precio: 2500, costo: 1600, stock: 18, esDePaquete: false },
  { nombre: "Bolsa basura pequena", categoria: "Otros", precio: 500, costo: 250, stock: 100, esDePaquete: false },
];

const clientesNombres = [
  "Don Julio",
  "Doña Clara",
  "Carlos Mario",
  "Vecina Luz",
  "Juan K",
  "María Camila",
  "El Profe",
];

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

function elegirProducto(productosGuardados: any[]) {
  const totalPeso = productosGuardados.reduce((acc, p) => acc + (PESOS_VENTA[p.nombre] ?? 5), 0);
  let rnd = Math.random() * totalPeso;
  for (const p of productosGuardados) {
    const peso = PESOS_VENTA[p.nombre] ?? 5;
    rnd -= peso;
    if (rnd <= 0) return p;
  }
  return productosGuardados[productosGuardados.length - 1];
}

async function main() {
  console.log("🌱 Iniciando inyección de datos simulados...");

  // Limpiar base de datos
  console.log("🧹 Limpiando registros antiguos...");
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "cierres_caja", "logs_auditoria", "fiados", "ventas", "transacciones", "clientes", "productos", "categorias", "usuarios" CASCADE;');

  // 1. Crear Usuarios
  console.log("👤 Creando usuarios...");
  const adminPasswordHash = await bcrypt.hash("Admin123*", 10);
  const vendedorPasswordHash = await bcrypt.hash("Vendedor123*", 10);

  const adminUser = await prisma.usuario.create({
    data: {
      nombre: "Administrador",
      usuario: "admin",
      passwordHash: adminPasswordHash,
      rol: RolUsuario.ADMIN,
    },
  });

  const vendedorUser = await prisma.usuario.create({
    data: {
      nombre: "Vendedor",
      usuario: "vendedor",
      passwordHash: vendedorPasswordHash,
      rol: RolUsuario.VENDEDOR,
    },
  });

  const usuarios = [adminUser, vendedorUser];

  // 2. Crear Categorías
  console.log("📂 Creando categorías...");
  const categoriasGuardadas = [];
  for (const cat of categorias) {
    const c = await prisma.categoria.create({
      data: cat,
    });
    categoriasGuardadas.push(c);
  }

  // 3. Crear Productos
  console.log("📦 Creando productos...");
  const productosGuardados = [];
  for (const prod of productos) {
    const cat = categoriasGuardadas.find((c) => c.nombre === prod.categoria)!;
    const p = await prisma.producto.create({
      data: {
        nombre: prod.nombre,
        categoriaId: cat.id,
        precio: prod.precio,
        costo: prod.costo,
        stock: prod.stock,
        esDePaquete: prod.esDePaquete,
      },
    });
    productosGuardados.push(p);
  }

  // 4. Crear Clientes
  console.log("👥 Creando clientes para fiados...");
  const clientesGuardados = [];
  for (const nombre of clientesNombres) {
    const c = await prisma.cliente.create({
      data: {
        nombre,
        telefono: `31${randInt(0, 9)}${randInt(1000000, 9999999)}`,
      },
    });
    clientesGuardados.push(c);
  }

  // 5. Generar Transacciones y Ventas (Historial  // --- GENERAR 180 DÍAS DE VENTAS SIMULADAS ---
  console.log("📊 Generando 180 días de ventas simuladas...");
  const hoy = new Date();

  for (let dia = 180; dia >= 0; dia--) {
    const fechaDia = new Date(hoy);
    fechaDia.setDate(hoy.getDate() - dia);

    const esFinDeSemana = fechaDia.getDay() === 0 || fechaDia.getDay() === 6;
    const factorVentas = esFinDeSemana ? 1.6 : 1.0;
    const factorTendencia = dia > 90 ? 1.0 : 1.2;
    const cantidadTransacciones = Math.round(randInt(10, 25) * factorVentas * factorTendencia);

    // Totales diarios para Cierre de Caja
    let diarioEfectivo = 0;
    let diarioNequi = 0;
    let diarioBancolombia = 0;
    let diarioFiado = 0;
    let diarioTotal = 0;

    for (let t = 0; t < cantidadTransacciones; t++) {
      const vendedor = usuarios[Math.random() < 0.7 ? 1 : 0]; // 70% vendedor, 30% admin

      // Determinar hora de la transacción
      const hora = randInt(7, 21);
      const minuto = randInt(0, 59);
      const fechaTransaccion = new Date(fechaDia);
      fechaTransaccion.setHours(hora, minuto, 0, 0);

      const cantItems = randInt(1, 5);
      const itemsVendidos: { producto: any; cantidad: number; total: number }[] = [];
      let totalTransaccion = 0;

      for (let i = 0; i < cantItems; i++) {
        const prod = elegirProducto(productosGuardados);
        // Evitar duplicados del mismo producto en la misma transacción
        if (itemsVendidos.some(item => item.producto.id === prod.id)) continue;

        const cantidad = randInt(1, prod.esDePaquete ? 1 : 4);
        const totalItem = Number(prod.precio) * cantidad;
        totalTransaccion += totalItem;

        itemsVendidos.push({
          producto: prod,
          cantidad,
          total: totalItem,
        });
      }

      // Distribución de formas de pago
      let pagoEfectivo = 0;
      let pagoNequi = 0;
      let pagoBancolombia = 0;
      let pagoFiado = 0;

      const randomPago = Math.random();
      if (randomPago < 0.6) {
        // 60% solo efectivo
        pagoEfectivo = totalTransaccion;
      } else if (randomPago < 0.8) {
        // 20% monederos virtuales
        if (Math.random() < 0.5) {
          pagoNequi = totalTransaccion;
        } else {
          pagoBancolombia = totalTransaccion;
        }
      } else if (randomPago < 0.95) {
        // 15% fiado
        pagoFiado = totalTransaccion;
      } else {
        // 5% mixto (Efectivo + Nequi/Bancolombia)
        pagoEfectivo = Math.round(totalTransaccion * 0.5);
        pagoNequi = totalTransaccion - pagoEfectivo;
      }

      // Crear transacción
      const transaccion = await prisma.transaccion.create({
        data: {
          fecha: fechaTransaccion,
          vendedorId: vendedor.id,
          total: totalTransaccion,
          pagoEfectivo,
          pagoNequi,
          pagoBancolombia,
          pagoFiado,
        },
      });

      // Crear ventas asociadas
      for (const item of itemsVendidos) {
        await prisma.venta.create({
          data: {
            productoId: item.producto.id,
            transaccionId: transaccion.id,
            cantidad: item.cantidad,
            precioUnitario: item.producto.precio,
            total: item.total,
            fecha: fechaTransaccion,
          },
        });
      }

      // Si es fiado, crear el registro de Fiado
      if (pagoFiado > 0) {
        const cliente = clientesGuardados[randInt(0, clientesGuardados.length - 1)];
        // Algunos fiados ya están pagados, otros pendientes
        const estadoRandom = Math.random();
        let estado: EstadoFiado = EstadoFiado.PENDIENTE;
        let montoPagado = 0;

        if (estadoRandom < 0.4) {
          estado = EstadoFiado.PAGADO_TOTAL;
          montoPagado = pagoFiado;
        } else if (estadoRandom < 0.7) {
          estado = EstadoFiado.PAGADO_PARCIAL;
          montoPagado = Math.round(pagoFiado * 0.4);
        }

        await prisma.fiado.create({
          data: {
            clienteId: cliente.id,
            transaccionId: transaccion.id,
            montoTotal: pagoFiado,
            montoPagado,
            estado,
            fechaCreacion: fechaTransaccion,
            notas: estado === EstadoFiado.PENDIENTE ? "Pendiente de pago" : "Abono registrado",
          },
        });

        diarioFiado += pagoFiado;
      }

      diarioEfectivo += pagoEfectivo;
      diarioNequi += pagoNequi;
      diarioBancolombia += pagoBancolombia;
      diarioTotal += totalTransaccion;
    }

    // Crear cierre de caja al final del día
    const fechaCierre = new Date(fechaDia);
    fechaCierre.setHours(21, 30, 0, 0); // Cerrar a las 9:30 PM

    await prisma.cierreCaja.create({
      data: {
        fecha: fechaCierre,
        totalVentas: diarioTotal,
        numeroTransacciones: cantidadTransacciones,
        totalEfectivo: diarioEfectivo,
        totalNequi: diarioNequi,
        totalBancolombia: diarioBancolombia,
        totalFiado: diarioFiado,
        usuarioId: adminUser.id, // Administrador realiza el cierre
      },
    });

    // Agregar logs de auditoría aleatorios por día
    if (Math.random() < 0.4) {
      const fechaLog = new Date(fechaDia);
      fechaLog.setHours(randInt(8, 18), randInt(0, 59));
      await prisma.logAuditoria.create({
        data: {
          usuarioId: adminUser.id,
          accion: "Ajuste de inventario diario realizado.",
          fecha: fechaLog,
        },
      });
    }
  }

  // 6. Crear algunos logs de auditoría generales recientes
  console.log("📝 Creando logs de auditoría recientes...");
  await prisma.logAuditoria.create({
    data: {
      usuarioId: adminUser.id,
      accion: "Inicio de sesión del Administrador.",
      fecha: new Date(),
    },
  });

  console.log("✅ Ventas simuladas generadas para los últimos 180 días.");
  console.log("👥 Credenciales creadas:");
  console.log("   Admin:    admin / Admin123*");
  console.log("   Vendedor: vendedor / Vendedor123*");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
