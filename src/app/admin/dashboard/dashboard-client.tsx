"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import toast from "react-hot-toast";

type Estadisticas = {
  ventasPorCategoria: { categoria: string; total: number; cantidad: number }[];
  ventasPorDia: { fecha: string; total: number }[];
  totalesGenerales: { ventas: number; unidades: number; total: number };
};

type SaludNegocio = {
  estado: "calentando_motores" | "listo";
  mensaje?: string;
  score?: number;
  componentes?: {
    crecimiento: { valor: number; score: number; contribucion: number };
    stock: { total: number; saludables: number; score: number; contribucion: number };
    diversidad: { total: number; vendidas: number; score: number; contribucion: number };
    proyeccion: { proyeccion: number; lineaBase: number; score: number; contribucion: number };
  };
};

type TopProductos = {
  masVendidos: { id: string; nombre: string; categoria: string; cantidad: number; total: number; stock: number }[];
  menosVendidos: { id: string; nombre: string; categoria: string; cantidad: number; total: number; stock: number }[];
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

export function DashboardClient() {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [salud, setSalud] = useState<SaludNegocio | null>(null);
  const [topProductos, setTopProductos] = useState<TopProductos | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    async function loadData() {
      try {
        const [resEst, resSalud, resTop] = await Promise.all([
          fetch("/api/estadisticas"),
          fetch("/api/salud-negocio"),
          fetch("/api/top-productos"),
        ]);

        if (!resEst.ok || !resSalud.ok || !resTop.ok) {
          throw new Error("No se pudo cargar la información del dashboard.");
        }

        const dataEst = await resEst.json();
        const dataSalud = await resSalud.json();
        const dataTop = await resTop.json();

        setEstadisticas(dataEst);
        setSalud(dataSalud);
        setTopProductos(dataTop);
      } catch (error) {
        console.error(error);
        toast.error("Error al cargar datos del dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50 p-8" />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
        <p className="mt-4 text-base font-semibold text-slate-600">
          Cargando datos del panel administrador...
        </p>
      </div>
    );
  }

  // Si no hay estadísticas básicas disponibles
  if (!estadisticas) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <p className="font-bold">Error de carga</p>
          <p className="text-sm mt-1">No se pudieron recuperar las estadísticas de la base de datos.</p>
        </div>
      </div>
    );
  }

  const { totalesGenerales, ventasPorCategoria, ventasPorDia } = estadisticas;

  // Configuración del Gauge para Salud de Negocio
  const score = salud?.score ?? 0;
  const isCalentando = salud?.estado === "calentando_motores";
  
  // Datos del Gauge de Recharts
  const gaugeData = [
    {
      name: "Score",
      value: score,
      fill: score > 70 ? "#10b981" : score > 40 ? "#f59e0b" : "#ef4444",
    },
  ];

  // Mensaje y color según el rango del score de salud
  let saludMensaje = "";
  let saludTitulo = "";
  let saludBadgeColor = "";
  let saludTextColor = "";

  if (isCalentando) {
    saludTitulo = "Calentando Motores";
    saludMensaje = salud?.mensaje || "Se requiere acumular al menos 15 días de historial de ventas.";
    saludBadgeColor = "bg-blue-100 text-blue-800";
    saludTextColor = "text-blue-700";
  } else if (score > 70) {
    saludTitulo = "Excelente";
    saludMensaje = "¡Excelente salud del negocio! Sigue así, el negocio va viento en popa.";
    saludBadgeColor = "bg-emerald-100 text-emerald-800";
    saludTextColor = "text-emerald-700";
  } else if (score > 40) {
    saludTitulo = "Estable";
    saludMensaje = "Salud estable. Buen rendimiento, pero hay oportunidades de mejora.";
    saludBadgeColor = "bg-amber-100 text-amber-800";
    saludTextColor = "text-amber-700";
  } else {
    saludTitulo = "Crítico";
    saludMensaje = "Salud deficiente. ¡Necesitamos impulsar las ventas y revisar los niveles de stock!";
    saludBadgeColor = "bg-red-100 text-red-800";
    saludTextColor = "text-red-700";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Encabezado */}
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
              Panel de Control
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Dashboard de Administración
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm border border-slate-200 text-sm font-semibold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Actualizado en tiempo real</span>
          </div>
        </header>

        {/* Tarjetas de Métricas Generales (KPIs) */}
        <section className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Ingresos Totales */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Ingresos del Mes
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black tracking-tight text-slate-900">
                ${totalesGenerales.total.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Recaudación total acumulada.
              </p>
            </div>
          </div>

          {/* Transacciones */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Transacciones Totales
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <ShoppingCart size={20} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black tracking-tight text-slate-900">
                {totalesGenerales.ventas} ventas
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Número de facturas emitidas.
              </p>
            </div>
          </div>

          {/* Unidades Vendidas */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Unidades Vendidas
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                <Package size={20} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black tracking-tight text-slate-900">
                {totalesGenerales.unidades} uds.
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Productos individuales entregados.
              </p>
            </div>
          </div>
        </section>

        {/* Primera Fila: Salud de Negocio + Ventas por Categoría */}
        <section className="mb-8 grid gap-8 lg:grid-cols-3">
          {/* Índice de Salud del Negocio (Wow Component) */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-800">
              <Activity className="text-emerald-600" size={22} />
              Salud del Negocio
            </h2>
            <div className="mt-2 h-px bg-slate-100" />

            <div className="flex-1 flex flex-col items-center justify-center py-6">
              {isCalentando ? (
                <div className="text-center py-8 px-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 animate-pulse">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-blue-900">Modo Inicial</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {saludMensaje}
                  </p>
                </div>
              ) : (
                <div className="relative flex flex-col items-center">
                  {/* Gauge Render */}
                  <div className="h-44 w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="70%"
                        innerRadius="75%"
                        outerRadius="100%"
                        barSize={12}
                        data={gaugeData}
                        startAngle={180}
                        endAngle={0}
                      >
                        <RadialBar
                          background
                          dataKey="value"
                          cornerRadius={6}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Puntuación e información superpuesta */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-center">
                    <span className={`text-4xl font-black tracking-tight ${saludTextColor}`}>
                      {score}
                    </span>
                    <span className="text-slate-400 font-bold block text-xs">de 100</span>
                    <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${saludBadgeColor}`}>
                      {saludTitulo}
                    </span>
                  </div>

                  <p className="mt-4 text-center text-sm font-semibold text-slate-600 max-w-[240px]">
                    {saludMensaje}
                  </p>
                </div>
              )}
            </div>

            {/* Desglose de componentes (si no está calentando) */}
            {!isCalentando && salud?.componentes && (
              <div className="mt-4 border-t border-slate-100 pt-4 space-y-2 text-xs">
                <p className="font-bold text-slate-500 uppercase tracking-wider mb-2">Desglose de Puntos:</p>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Crecimiento Ventas (40%)</span>
                  <span className="font-extrabold text-slate-800">{salud.componentes.crecimiento.contribucion} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Stock Saludable (20%)</span>
                  <span className="font-extrabold text-slate-800">{salud.componentes.stock.contribucion} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Diversidad Categorías (20%)</span>
                  <span className="font-extrabold text-slate-800">{salud.componentes.diversidad.contribucion} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Proyección Ventas (20%)</span>
                  <span className="font-extrabold text-slate-800">{salud.componentes.proyeccion.contribucion} pts</span>
                </div>
              </div>
            )}
          </div>

          {/* Barras: Ventas por Categoría */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 min-w-0">
            <h2 className="text-xl font-extrabold text-slate-800">Ventas por Categoría (Cantidad)</h2>
            <div className="mt-2 h-px bg-slate-100" />

            <div className="mt-6 h-72 w-full min-w-0">
              {ventasPorCategoria.length > 0 ? (
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart
                    data={ventasPorCategoria}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="categoria"
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight="bold"
                      tickLine={false}
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "none", borderRadius: "12px", color: "#fff" }}
                      itemStyle={{ color: "#34d399", fontWeight: "bold" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: "bold", paddingTop: 10 }} />
                    <Bar
                      dataKey="cantidad"
                      name="Cantidad Vendida"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Sin ventas registradas este mes.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Segunda Fila: Tendencia de Ventas (Últimos 30 días) */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm w-full min-w-0">
          <h2 className="text-xl font-extrabold text-slate-800">Tendencia de Ventas (Últimos 30 días)</h2>
          <div className="mt-2 h-px bg-slate-100" />

          <div className="mt-6 h-80 w-full min-w-0">
            {ventasPorDia.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <LineChart
                  data={ventasPorDia}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="fecha"
                    stroke="#94a3b8"
                    fontSize={11}
                    fontWeight="bold"
                    tickLine={false}
                    tickFormatter={(tick) => tick.slice(5)} // mostrar solo mm-dd
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "none", borderRadius: "12px", color: "#fff" }}
                    itemStyle={{ color: "#60a5fa", fontWeight: "bold" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: "bold", paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Ingresos Diarios"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                Sin datos de ventas en los últimos 30 días.
              </div>
            )}
          </div>
        </section>

        {/* Tercera Fila: Distribución de Ingresos (Pie) + Top Productos */}
        <section className="grid gap-8 lg:grid-cols-3">
          {/* Distribución de Ingresos por Categoría */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col min-w-0">
            <h2 className="text-xl font-extrabold text-slate-800">Distribución de Ingresos</h2>
            <p className="text-xs text-slate-500">Proporción por categoría de producto</p>
            <div className="mt-2 h-px bg-slate-100" />

            <div className="mt-6 h-64 w-full min-w-0 flex-1">
              {ventasPorCategoria.length > 0 ? (
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={ventasPorCategoria}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="categoria"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {ventasPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "none", borderRadius: "12px", color: "#fff" }}
                      itemStyle={{ fontWeight: "bold" }}
                      formatter={(value) => `$${Number(value).toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Sin ingresos registrados este mes.
                </div>
              )}
            </div>
          </div>

          {/* Top 5 y Bottom 5 Productos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <ArrowUpRight className="text-emerald-600" size={22} />
                Top 5 Más Vendidos del Mes
              </h2>
              <div className="mt-2 h-px bg-slate-100" />
              
              {topProductos && topProductos.masVendidos.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2 rounded-l-lg">Producto</th>
                        <th className="px-4 py-2">Categoría</th>
                        <th className="px-4 py-2">Uds. Vendidas</th>
                        <th className="px-4 py-2">Ingresos</th>
                        <th className="px-4 py-2 rounded-r-lg text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {topProductos.masVendidos.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{prod.nombre}</td>
                          <td className="px-4 py-2.5 text-slate-500">{prod.categoria}</td>
                          <td className="px-4 py-2.5 text-slate-800 font-black">{prod.cantidad}</td>
                          <td className="px-4 py-2.5 text-emerald-700 font-extrabold">${prod.total.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${prod.stock < 10 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                              {prod.stock}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-2">No hay datos de productos disponibles.</p>
              )}
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <ArrowDownRight className="text-red-500" size={22} />
                Top 5 Menos Vendidos del Mes
              </h2>
              <div className="mt-2 h-px bg-slate-100" />

              {topProductos && topProductos.menosVendidos.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2 rounded-l-lg">Producto</th>
                        <th className="px-4 py-2">Categoría</th>
                        <th className="px-4 py-2">Uds. Vendidas</th>
                        <th className="px-4 py-2">Ingresos</th>
                        <th className="px-4 py-2 rounded-r-lg text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {topProductos.menosVendidos.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{prod.nombre}</td>
                          <td className="px-4 py-2.5 text-slate-500">{prod.categoria}</td>
                          <td className="px-4 py-2.5 text-slate-800">{prod.cantidad}</td>
                          <td className="px-4 py-2.5 text-slate-800">${prod.total.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${prod.stock < 10 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                              {prod.stock}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-2">No hay datos de productos disponibles.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
