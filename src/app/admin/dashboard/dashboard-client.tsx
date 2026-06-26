"use client";

import { useEffect, useState, useCallback } from "react";
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
  Calendar,
} from "lucide-react";

/* ─── Tipos ─────────────────────────────────────────────────────────── */
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

const COLORES = ["#0ea5e9", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#64748b"];

/* ─── Períodos disponibles ───────────────────────────────────────────── */
type Periodo = { label: string; dias: number | null };
const PERIODOS: Periodo[] = [
  { label: "Hoy",       dias: 1 },
  { label: "7 días",   dias: 7 },
  { label: "30 días",  dias: 30 },
  { label: "3 meses",  dias: 90 },
  { label: "6 meses",  dias: 180 },
  { label: "1 año",    dias: 365 },
  { label: "Todo",     dias: null },
];

function buildDateParams(dias: number | null) {
  if (dias === null) return "?all=true";
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - dias);
  return `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
}

/* ─── Componente ─────────────────────────────────────────────────────── */
export function DashboardClient() {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [salud, setSalud] = useState<SaludNegocio | null>(null);
  const [topProductos, setTopProductos] = useState<TopProductos | null>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [montado, setMontado] = useState(false);
  const [esMobile, setEsMobile] = useState(false);
  const [periodoActivo, setPeriodoActivo] = useState<Periodo>(PERIODOS[2]); // 30 días por defecto

  /* Detectar tamaño de pantalla */
  useEffect(() => {
    const actualizar = () => setEsMobile(window.innerWidth < 768);
    actualizar();
    window.addEventListener("resize", actualizar);
    return () => window.removeEventListener("resize", actualizar);
  }, []);

  /* Cargar datos */
  const cargarDatos = useCallback(async (periodo: Periodo) => {
    setCargando(true);
    setError(null);
    try {
      const params = buildDateParams(periodo.dias);
      const [resEst, resSalud, resTop, resProd] = await Promise.all([
        fetch(`/api/estadisticas${params}`),
        fetch(`/api/salud-negocio${params}`),
        fetch(`/api/top-productos${params}`),
        fetch("/api/productos"),
      ]);

      if (!resEst.ok) {
        const msg = resEst.status === 403
          ? "No tienes permiso para ver el panel. Inicia sesión como administrador."
          : "Error al cargar estadísticas.";
        setError(msg);
        return;
      }

      setEstadisticas(await resEst.json());
      if (resSalud.ok) setSalud(await resSalud.json());
      if (resTop.ok) setTopProductos(await resTop.json());
      if (resProd.ok) {
        const data = await resProd.json();
        setProductos(data.data || []);
      }
    } catch {
      setError("No se pudo conectar con el servidor. Verifica tu conexión.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    setMontado(true);
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    window.scrollTo({ left: 0, top: window.scrollY });
    cargarDatos(periodoActivo);
  }, []);

  function cambiarPeriodo(p: Periodo) {
    setPeriodoActivo(p);
    cargarDatos(p);
  }

  /* ── Estados de carga / error ── */
  if (!montado) return <div className="min-h-screen bg-slate-50" />;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 max-w-lg">
          <p className="font-bold text-lg">⚠️ No se pudo cargar el panel</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const { totalesGenerales, ventasPorCategoria, ventasPorDia } = estadisticas ?? {
    totalesGenerales: { ventas: 0, unidades: 0, total: 0 },
    ventasPorCategoria: [],
    ventasPorDia: [],
  };

  /* ── Salud del negocio ── */
  const puntaje = salud?.score ?? 0;
  const estaCalentando = salud?.estado === "calentando_motores";

  const gaugeData = [{ name: "Puntaje", value: puntaje, fill: puntaje > 70 ? "#10b981" : puntaje > 40 ? "#f59e0b" : "#ef4444" }];

  let saludTitulo = "";
  let saludMensaje = "";
  let saludBadge = "";
  let saludColor = "";

  if (estaCalentando) {
    saludTitulo = "Iniciando";
    saludMensaje = salud?.mensaje || "Se necesitan más días de ventas para calcular la salud.";
    saludBadge = "bg-blue-100 text-blue-800";
    saludColor = "text-blue-700";
  } else if (puntaje > 70) {
    saludTitulo = "Excelente";
    saludMensaje = "¡El negocio va muy bien! Sigue así.";
    saludBadge = "bg-emerald-100 text-emerald-800";
    saludColor = "text-emerald-700";
  } else if (puntaje > 40) {
    saludTitulo = "Estable";
    saludMensaje = "El negocio está bien, pero hay cosas que mejorar.";
    saludBadge = "bg-amber-100 text-amber-800";
    saludColor = "text-amber-700";
  } else {
    saludTitulo = "Necesita atención";
    saludMensaje = "Las ventas están bajas o el stock es insuficiente.";
    saludBadge = "bg-red-100 text-red-800";
    saludColor = "text-red-700";
  }

  /* ── Render principal ── */
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 py-5 text-slate-900 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-3 sm:space-y-8 sm:px-0">

        {/* Encabezado + selector de período */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-primary-700">Panel de Control</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Resumen de la Tienda</h1>
          </div>

          {/* Selector de período */}
          <div className="flex min-w-0 items-start gap-2 sm:items-center">
            <Calendar size={16} className="text-slate-400 shrink-0" />
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {PERIODOS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => cambiarPeriodo(p)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all sm:px-3 ${
                    periodoActivo.label === p.label
                      ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-primary-400 hover:text-primary-600"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── KPIs ── */}
        <section className="grid min-w-0 gap-4 sm:grid-cols-3 sm:gap-5">
          {cargando ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <KpiCard
                titulo="Dinero Recaudado"
                valor={`$${totalesGenerales.total.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                descripcion={`Total de ingresos — ${periodoActivo.label === "Todo" ? "histórico completo" : periodoActivo.label}`}
                icono={<DollarSign size={20} />}
                color="primary"
              />
              <KpiCard
                titulo="Ventas Realizadas"
                valor={`${totalesGenerales.ventas}`}
                descripcion="Número de ventas registradas."
                icono={<ShoppingCart size={20} />}
                color="blue"
              />
              <KpiCard
                titulo="Productos Vendidos"
                valor={`${totalesGenerales.unidades} uds.`}
                descripcion="Unidades entregadas en total."
                icono={<Package size={20} />}
                color="amber"
              />
            </>
          )}
        </section>

        {/* ── ALERTA DE STOCK (SEMÁFORO) ── */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-slate-800 sm:mb-6 sm:text-xl">
            <Package className="text-slate-500" size={24} />
            Estado del Inventario (Semáforo)
          </h2>

          {cargando ? (
            <div className="animate-pulse h-32 bg-slate-100 rounded-xl w-full" />
          ) : (
            <div className="grid min-w-0 gap-4 md:grid-cols-3 md:gap-6">
              {/* Rojo (Agotados) */}
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-4 w-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse" />
                  <h3 className="font-bold text-red-800">Agotado (0 ud.)</h3>
                </div>
                <div className="text-3xl font-black text-red-700 mb-3">
                  {productos.filter(p => p.stock === 0).length} <span className="text-sm font-medium text-red-600/70">productos</span>
                </div>
                <div className="text-xs text-red-700/80 max-h-24 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                  {productos.filter(p => p.stock === 0).slice(0, 10).map(p => (
                    <div key={p.id} className="flex justify-between border-b border-red-200/50 pb-1">
                      <span className="truncate pr-2">{p.nombre}</span>
                      <span className="font-bold">0</span>
                    </div>
                  ))}
                  {productos.filter(p => p.stock === 0).length > 10 && (
                    <div className="text-center text-[10px] uppercase font-bold mt-2">Ver todos en Inventario</div>
                  )}
                  {productos.filter(p => p.stock === 0).length === 0 && (
                    <div className="italic">No hay productos agotados.</div>
                  )}
                </div>
              </div>

              {/* Amarillo (Poco Stock) */}
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-4 w-4 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                  <h3 className="font-bold text-amber-800">Poco Stock (1-5 ud.)</h3>
                </div>
                <div className="text-3xl font-black text-amber-700 mb-3">
                  {productos.filter(p => p.stock > 0 && p.stock <= 5).length} <span className="text-sm font-medium text-amber-600/70">productos</span>
                </div>
                <div className="text-xs text-amber-700/80 max-h-24 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                  {productos.filter(p => p.stock > 0 && p.stock <= 5).slice(0, 10).map(p => (
                    <div key={p.id} className="flex justify-between border-b border-amber-200/50 pb-1">
                      <span className="truncate pr-2">{p.nombre}</span>
                      <span className="font-bold">{p.stock}</span>
                    </div>
                  ))}
                  {productos.filter(p => p.stock > 0 && p.stock <= 5).length > 10 && (
                    <div className="text-center text-[10px] uppercase font-bold mt-2">Ver todos en Inventario</div>
                  )}
                  {productos.filter(p => p.stock > 0 && p.stock <= 5).length === 0 && (
                    <div className="italic">No hay productos con poco stock.</div>
                  )}
                </div>
              </div>

              {/* Verde (Saludable) */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                  <h3 className="font-bold text-emerald-800">Saludable (+5 ud.)</h3>
                </div>
                <div className="text-3xl font-black text-emerald-700 mb-3">
                  {productos.filter(p => p.stock > 5).length} <span className="text-sm font-medium text-emerald-600/70">productos</span>
                </div>
                <p className="text-xs text-emerald-700/80 mt-2">
                  Estos productos cuentan con un volumen adecuado para afrontar las ventas regulares.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── Salud del negocio + Ventas por categoría ── */}
        <section className="grid min-w-0 gap-5 lg:grid-cols-3 lg:gap-8">

          {/* Salud */}
          <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
              <Activity className="text-primary-600" size={20} />
              Estado del Negocio
            </h2>
            <div className="mt-2 h-px bg-slate-100" />

            <div className="flex-1 flex flex-col items-center justify-center py-4">
              {estaCalentando ? (
                <div className="text-center py-6 px-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 animate-pulse">
                    <AlertCircle size={28} />
                  </div>
                  <h3 className="mt-3 text-base font-black text-blue-900">Recopilando datos</h3>
                  <p className="mt-2 text-sm text-slate-500">{saludMensaje}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <div className="h-40 w-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%" cy="70%"
                        innerRadius="75%" outerRadius="100%"
                        barSize={12}
                        data={gaugeData}
                        startAngle={180} endAngle={0}
                      >
                        <RadialBar background dataKey="value" cornerRadius={6} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="-mt-12 text-center">
                    <span className={`text-4xl font-black ${saludColor}`}>{puntaje}</span>
                    <span className="block text-xs text-slate-400 font-bold">de 100 puntos</span>
                    <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${saludBadge}`}>
                      {saludTitulo}
                    </span>
                  </div>
                  <p className="mt-3 text-center text-sm text-slate-500 max-w-[220px]">{saludMensaje}</p>
                </div>
              )}
            </div>

            {/* Desglose en español */}
            {!estaCalentando && salud?.componentes && (
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-2">Cómo se calcula:</p>
                <FilaDesglose etiqueta="Crecimiento de ventas" puntos={salud.componentes.crecimiento.contribucion} maximo={40} />
                <FilaDesglose etiqueta="Stock disponible" puntos={salud.componentes.stock.contribucion} maximo={20} />
                <FilaDesglose etiqueta="Variedad de productos" puntos={salud.componentes.diversidad.contribucion} maximo={20} />
                <FilaDesglose etiqueta="Proyección del mes" puntos={salud.componentes.proyeccion.contribucion} maximo={20} />
              </div>
            )}
          </div>

          {/* Ventas por categoría */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
            <h2 className="text-lg font-extrabold text-slate-800">Ventas por Categoría</h2>
            <p className="text-xs text-slate-500">Cuántas unidades se han vendido de cada tipo de producto — {periodoActivo.label}.</p>
            <div className="mt-2 h-px bg-slate-100" />
            <div className="mt-4 h-64 w-full min-w-0 overflow-hidden">
              {cargando ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
                </div>
              ) : ventasPorCategoria.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ventasPorCategoria}
                    margin={{ top: 10, right: esMobile ? 4 : 10, left: esMobile ? -18 : -20, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="categoria"
                      stroke="#94a3b8" fontSize={esMobile ? 9 : 11} fontWeight="bold"
                      tickLine={false} angle={esMobile ? -45 : -20} textAnchor="end" interval={0}
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} width={esMobile ? 35 : 50} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }}
                      formatter={(v) => [v, "Unidades vendidas"]}
                      labelStyle={{ fontWeight: "bold", color: "#64748b" }}
                    />
                    <Bar dataKey="cantidad" name="Unidades vendidas" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm">Sin ventas en este período.</div>
              )}
            </div>
          </div>
        </section>

        {/* ── Tendencia de ventas por día ── */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-extrabold text-slate-800">
            Ingresos Diarios — <span className="text-primary-600">{periodoActivo.label}</span>
          </h2>
          <p className="text-xs text-slate-500">Cuánto dinero ingresó cada día.</p>
          <div className="mt-2 h-px bg-slate-100" />
          <div className="mt-4 h-64 w-full min-w-0 overflow-hidden sm:h-80">
            {cargando ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
              </div>
            ) : ventasPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={ventasPorDia}
                  margin={{ top: 10, right: esMobile ? 4 : 10, left: esMobile ? -14 : -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="fecha" stroke="#94a3b8" fontSize={10} fontWeight="bold"
                    tickLine={false}
                    interval={ventasPorDia.length > 60 ? Math.floor(ventasPorDia.length / 15) : esMobile ? 6 : 1}
                    tickFormatter={(t) => typeof t === "string" ? t.slice(5) : ""}
                  />
                  <YAxis
                    stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false}
                    width={esMobile ? 45 : 65}
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                  />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }}
                    formatter={(v) => [`$${Number(v).toLocaleString("es-CO")}`, "Ingresos del día"]}
                    labelStyle={{ fontWeight: "bold", color: "#64748b" }}
                  />
                  <Line
                    type="monotone" dataKey="total" name="Ingresos"
                    stroke="#2563eb" strokeWidth={esMobile ? 2 : 3}
                    dot={ventasPorDia.length > 60 ? false : esMobile ? false : { r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">Sin datos de ventas en este período.</div>
            )}
          </div>
        </section>

        {/* ── Distribución de ingresos (torta) + Top 5 ── */}
        <section className="grid min-w-0 gap-5 lg:grid-cols-3 lg:gap-8">

          {/* Torta de ingresos por categoría */}
          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-extrabold text-slate-800">Ingresos por Categoría</h2>
            <p className="text-xs text-slate-500">Proporción del dinero recaudado por tipo de producto.</p>
            <div className="mt-2 h-px bg-slate-100" />
            <div className="mt-4 h-64 w-full min-w-0 flex-1 overflow-hidden">
              {cargando ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
                </div>
              ) : ventasPorCategoria.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ventasPorCategoria} cx="50%" cy="45%"
                      innerRadius={esMobile ? "46%" : "58%"} outerRadius={esMobile ? "66%" : "82%"}
                      paddingAngle={4} dataKey="total" nameKey="categoria" stroke="none"
                    >
                      {ventasPorCategoria.map((_, i) => (
                        <Cell key={i} fill={COLORES[i % COLORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px" }}
                      formatter={(v) => [`$${Number(v).toLocaleString("es-CO")}`, "Ingresos"]}
                    />
                    <Legend
                      verticalAlign="bottom" height={esMobile ? 58 : 36} iconType="circle"
                      wrapperStyle={{ fontSize: esMobile ? 9 : 12, fontWeight: "500", paddingTop: esMobile ? "8px" : "16px", maxWidth: "100%", overflow: "hidden" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm">Sin ingresos en este período.</div>
              )}
            </div>
          </div>

          {/* Top 5 más vendidos + 5 menos vendidos */}
          <div className="min-w-0 space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">

            {/* Más vendidos */}
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <ArrowUpRight className="text-primary-600" size={20} />
                Top 5 Más Vendidos
              </h2>
              <div className="mt-1 h-px bg-slate-100" />
              {topProductos && topProductos.masVendidos.length > 0 ? (
                <div className="mt-3 min-w-0 overflow-x-auto">
                  <TablaProductos filas={topProductos.masVendidos} />
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-3">Sin datos para este período.</p>
              )}
            </div>

            {/* Menos vendidos */}
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <ArrowDownRight className="text-red-500" size={20} />
                Top 5 Menos Vendidos
              </h2>
              <div className="mt-1 h-px bg-slate-100" />
              {topProductos && topProductos.menosVendidos.length > 0 ? (
                <div className="mt-3 min-w-0 overflow-x-auto">
                  <TablaProductos filas={topProductos.menosVendidos} dimmed />
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-3">Sin datos para este período.</p>
              )}
            </div>
          </div>
        </section>


      </div>
    </main>
  );
}

/* ─── Componentes auxiliares ─────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="min-w-0 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="h-10 w-10 rounded-xl bg-slate-200" />
      </div>
      <div className="mt-4 h-8 w-36 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
    </div>
  );
}

function KpiCard({
  titulo, valor, descripcion, icono, color,
}: {
  titulo: string; valor: string; descripcion: string;
  icono: React.ReactNode; color: "primary" | "blue" | "amber";
}) {
  const bg = { primary: "bg-primary-50 text-primary-700 group-hover:bg-primary-600", blue: "bg-blue-50 text-blue-700 group-hover:bg-blue-600", amber: "bg-amber-50 text-amber-700 group-hover:bg-amber-600" }[color];
  return (
    <div className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">{titulo}</span>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 group-hover:text-white sm:h-10 sm:w-10 ${bg}`}>
          {icono}
        </div>
      </div>
      <h3 className="mt-4 max-w-full break-words text-[1.45rem] font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">{valor}</h3>
      <p className="mt-1 text-xs text-slate-500">{descripcion}</p>
    </div>
  );
}

function FilaDesglose({ etiqueta, puntos, maximo }: { etiqueta: string; puntos: number; maximo: number }) {
  const pct = Math.round((puntos / maximo) * 100);
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-slate-600">{etiqueta}</span>
        <span className="font-extrabold text-slate-800">{puntos}/{maximo} pts</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TablaProductos({ filas, dimmed }: {
  filas: { id: string; nombre: string; categoria: string; cantidad: number; total: number; stock: number }[];
  dimmed?: boolean;
}) {
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-left text-xs sm:min-w-[500px]">
      <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
        <tr>
          <th className="w-[42%] rounded-l-lg px-2 py-2 sm:w-auto sm:px-4">Producto</th>
          <th className="px-4 py-2 hidden sm:table-cell">Categoría</th>
          <th className="w-[24%] px-2 py-2 sm:w-auto sm:px-4">Unidades</th>
          <th className="w-[34%] px-2 py-2 sm:w-auto sm:px-4">Ingresos</th>
          <th className="px-4 py-2 text-right hidden sm:table-cell rounded-r-lg">En bodega</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
        {filas.map((prod) => (
          <tr key={prod.id} className="hover:bg-slate-50/50 transition">
            <td className={`truncate px-2 py-2.5 font-bold sm:px-4 ${dimmed ? "text-slate-700" : "text-slate-900"}`}>{prod.nombre}</td>
            <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{prod.categoria}</td>
            <td className="px-2 py-2.5 font-bold text-slate-800 sm:px-4">{prod.cantidad}</td>
            <td className={`px-2 py-2.5 font-extrabold sm:px-4 ${dimmed ? "text-slate-600" : "text-primary-700"}`}>
              ${prod.total.toLocaleString("es-CO")}
            </td>
            <td className="px-4 py-2.5 text-right hidden sm:table-cell">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${prod.stock < 10 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                {prod.stock}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
