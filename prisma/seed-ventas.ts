import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("⚡ Seed rápido de ventas iniciado...");

  // Limpiar solo ventas anteriores (si hubiera)
  await prisma.logAuditoria.deleteMany({});
  await prisma.cierreCaja.deleteMany({});
  await prisma.fiado.deleteMany({});
  await prisma.venta.deleteMany({});
  await prisma.transaccion.deleteMany({});

  // Obtener usuarios y productos existentes
  const usuarios = await prisma.usuario.findMany();
  const productos = await prisma.producto.findMany();
  const clientes = await prisma.cliente.findMany();

  if (!usuarios.length || !productos.length) {
    console.error("❌ No hay usuarios o productos. Corre el seed completo primero.");
    process.exit(1);
  }

  const admin = usuarios.find((u) => u.rol === "ADMIN") ?? usuarios[0];
  const PESOS: Record<string, number> = {
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

  function elegirProducto() {
    const total = productos.reduce((acc, p) => acc + (PESOS[p.nombre] ?? 5), 0);
    let rnd = Math.random() * total;
    for (const p of productos) {
      rnd -= PESOS[p.nombre] ?? 5;
      if (rnd <= 0) return p;
    }
    return productos[productos.length - 1];
  }

  // Generar todos los datos en memoria
  const transaccionesData: any[] = [];
  const ventasData: any[] = [];
  const fiadosData: any[] = [];
  const cierresData: any[] = [];
  const logsData: any[] = [];

  const hoy = new Date();
  console.log("📊 Generando datos en memoria...");

  for (let dia = 180; dia >= 0; dia--) {
    const fechaDia = new Date(hoy);
    fechaDia.setDate(hoy.getDate() - dia);

    const esFinDeSemana = fechaDia.getDay() === 0 || fechaDia.getDay() === 6;
    const factor = esFinDeSemana ? 1.6 : 1.0;
    const tendencia = dia > 90 ? 1.0 : 1.2;
    const cantTx = Math.round(randInt(10, 22) * factor * tendencia);

    let dEfectivo = 0, dNequi = 0, dBanc = 0, dFiado = 0, dTotal = 0;

    for (let t = 0; t < cantTx; t++) {
      const vendedor = usuarios[Math.random() < 0.7 ? (usuarios.length > 1 ? 1 : 0) : 0];
      const hora = randInt(7, 21);
      const min = randInt(0, 59);
      const fechaTx = new Date(fechaDia);
      fechaTx.setHours(hora, min, 0, 0);

      // Seleccionar items para esta transacción
      const usedIds = new Set<string>();
      const cantItems = randInt(1, 4);
      let totalTx = 0;
      const itemsTx: { prod: any; cant: number; total: number }[] = [];

      for (let i = 0; i < cantItems; i++) {
        const prod = elegirProducto();
        if (usedIds.has(prod.id)) continue;
        usedIds.add(prod.id);
        const cant = randInt(1, prod.esDePaquete ? 1 : 3);
        const totalItem = Number(prod.precio) * cant;
        totalTx += totalItem;
        itemsTx.push({ prod, cant, total: totalItem });
      }

      if (itemsTx.length === 0) continue;

      // Forma de pago
      const r = Math.random();
      let pagoEfectivo = 0, pagoNequi = 0, pagoBanc = 0, pagoFiado = 0;
      if (r < 0.6) pagoEfectivo = totalTx;
      else if (r < 0.75) pagoNequi = totalTx;
      else if (r < 0.85) pagoBanc = totalTx;
      else if (r < 0.95) pagoFiado = totalTx;
      else {
        pagoEfectivo = Math.round(totalTx * 0.5);
        pagoNequi = totalTx - pagoEfectivo;
      }

      // ID manual para poder relacionar ventas
      const txId = `tx_${dia}_${t}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      transaccionesData.push({
        id: txId,
        fecha: fechaTx,
        vendedorId: vendedor.id,
        total: totalTx,
        pagoEfectivo,
        pagoNequi,
        pagoBancolombia: pagoBanc,
        pagoFiado,
      });

      for (const item of itemsTx) {
        ventasData.push({
          productoId: item.prod.id,
          transaccionId: txId,
          cantidad: item.cant,
          precioUnitario: item.prod.precio,
          total: item.total,
          fecha: fechaTx,
        });
      }

      if (pagoFiado > 0 && clientes.length > 0) {
        const cliente = clientes[randInt(0, clientes.length - 1)];
        const rf = Math.random();
        let estado = "PENDIENTE";
        let montoPagado = 0;
        if (rf < 0.4) { estado = "PAGADO_TOTAL"; montoPagado = pagoFiado; }
        else if (rf < 0.7) { estado = "PAGADO_PARCIAL"; montoPagado = Math.round(pagoFiado * 0.4); }

        fiadosData.push({
          clienteId: cliente.id,
          transaccionId: txId,
          montoTotal: pagoFiado,
          montoPagado,
          estado,
          fechaCreacion: fechaTx,
          notas: estado === "PENDIENTE" ? "Pendiente de pago" : "Abono registrado",
        });
      }

      dEfectivo += pagoEfectivo;
      dNequi += pagoNequi;
      dBanc += pagoBanc;
      dFiado += pagoFiado;
      dTotal += totalTx;
    }

    const fechaCierre = new Date(fechaDia);
    fechaCierre.setHours(21, 30, 0, 0);
    cierresData.push({
      fecha: fechaCierre,
      totalVentas: dTotal,
      numeroTransacciones: cantTx,
      totalEfectivo: dEfectivo,
      totalNequi: dNequi,
      totalBancolombia: dBanc,
      totalFiado: dFiado,
      usuarioId: admin.id,
    });

    if (Math.random() < 0.3) {
      const fl = new Date(fechaDia);
      fl.setHours(randInt(8, 18), randInt(0, 59));
      logsData.push({
        usuarioId: admin.id,
        accion: "Revisión de inventario diaria.",
        fecha: fl,
      });
    }
  }

  console.log(`💾 Insertando ${transaccionesData.length} transacciones...`);
  // Insertar en lotes de 200
  const LOTE = 200;
  for (let i = 0; i < transaccionesData.length; i += LOTE) {
    await prisma.transaccion.createMany({ data: transaccionesData.slice(i, i + LOTE) });
  }

  console.log(`💾 Insertando ${ventasData.length} ventas...`);
  for (let i = 0; i < ventasData.length; i += LOTE) {
    await prisma.venta.createMany({ data: ventasData.slice(i, i + LOTE) });
  }

  console.log(`💾 Insertando ${fiadosData.length} fiados...`);
  for (let i = 0; i < fiadosData.length; i += LOTE) {
    await prisma.fiado.createMany({ data: fiadosData.slice(i, i + LOTE) });
  }

  console.log(`💾 Insertando ${cierresData.length} cierres de caja...`);
  for (let i = 0; i < cierresData.length; i += LOTE) {
    await prisma.cierreCaja.createMany({ data: cierresData.slice(i, i + LOTE) });
  }

  console.log(`💾 Insertando ${logsData.length} logs...`);
  if (logsData.length > 0) {
    await prisma.logAuditoria.createMany({ data: logsData });
  }

  console.log("✅ ¡Seed completado exitosamente!");
  console.log(`   📦 ${transaccionesData.length} transacciones`);
  console.log(`   🛒 ${ventasData.length} ventas`);
  console.log(`   💸 ${fiadosData.length} fiados`);
  console.log(`   🗓️  ${cierresData.length} cierres de caja`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
