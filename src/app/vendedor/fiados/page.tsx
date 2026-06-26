"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookUser,
  CheckCircle2,
  CircleDollarSign,
  Search,
  PlusCircle,
  X,
  Receipt,
  ChevronRight,
  Phone,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type Producto = { id: string; nombre: string };
type VentaItem = { id: string; producto: Producto; cantidad: number };
type Transaccion = { id: string; ventas: VentaItem[] };
type Cliente = { id: string; nombre: string; telefono: string | null };

type Fiado = {
  id: string;
  cliente: Cliente;
  montoTotal: string;
  montoPagado: string;
  estado: "PENDIENTE" | "PAGADO_PARCIAL" | "PAGADO_TOTAL";
  fechaCreacion: string;
  notas: string | null;
  transaccion: Transaccion | null;
};

// Perfil agrupado por cliente
type ClienteProfile = {
  cliente: Cliente;
  fiados: Fiado[];
  totalDeuda: number;       // suma de saldos pendientes
  totalOriginal: number;    // suma de montos totales
  totalPagado: number;      // suma de lo pagado
  fiadosActivos: number;
  estadoGeneral: "PAGADO_TOTAL" | "PAGADO_PARCIAL" | "PENDIENTE";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(value));
}

function getInitials(nombre: string) {
  return nombre
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarColor(nombre: string) {
  const colors = [
    "from-blue-500 to-blue-700",
    "from-violet-500 to-violet-700",
    "from-rose-500 to-rose-700",
    "from-amber-500 to-amber-700",
    "from-emerald-500 to-emerald-700",
    "from-cyan-500 to-cyan-700",
    "from-fuchsia-500 to-fuchsia-700",
    "from-orange-500 to-orange-700",
  ];
  let hash = 0;
  for (const c of nombre) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[hash];
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function FiadosPage() {
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  // "activos" = pendiente+parcial, "parcial", "pagados", "todos"
  const [statusFilter, setStatusFilter] = useState<"activos" | "parcial" | "pagados" | "todos">("activos");

  // Panel lateral de cliente
  const [selectedProfile, setSelectedProfile] = useState<ClienteProfile | null>(null);
  const [drawerFilter, setDrawerFilter] = useState<"activos" | "todos">("activos");

  // Modal de abono
  const [activeFiado, setActiveFiado] = useState<Fiado | null>(null);
  const [abonoAmount, setAbonoAmount] = useState<number | "">("");
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO" | "NEQUI" | "BANCOLOMBIA">("EFECTIVO");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadFiados() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/fiados?limit=500`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data.success) {
        setFiados(data.data);
      } else {
        toast.error(data.error || "Error al cargar los fiados");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadFiados(); }, []);

  // ─── Agrupar fiados por cliente ──────────────────────────────────────────
  const allProfiles = useMemo<ClienteProfile[]>(() => {
    const map = new Map<string, ClienteProfile>();

    for (const f of fiados) {
      const key = f.cliente.id;
      const saldo = Number(f.montoTotal) - Number(f.montoPagado);
      if (!map.has(key)) {
        map.set(key, {
          cliente: f.cliente,
          fiados: [],
          totalDeuda: 0,
          totalOriginal: 0,
          totalPagado: 0,
          fiadosActivos: 0,
          estadoGeneral: "PAGADO_TOTAL",
        });
      }
      const p = map.get(key)!;
      p.fiados.push(f);
      p.totalOriginal += Number(f.montoTotal);
      p.totalPagado += Number(f.montoPagado);
      p.totalDeuda += saldo;
      if (f.estado !== "PAGADO_TOTAL") p.fiadosActivos++;
    }

    // Calcular estado general
    for (const p of map.values()) {
      if (p.totalDeuda <= 0) p.estadoGeneral = "PAGADO_TOTAL";
      else if (p.totalPagado > 0) p.estadoGeneral = "PAGADO_PARCIAL";
      else p.estadoGeneral = "PENDIENTE";
    }

    const list = [...map.values()];

    // Filtro de búsqueda
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? list.filter((p) =>
          p.cliente.nombre.toLowerCase().includes(q) ||
          (p.cliente.telefono ?? "").includes(q)
        )
      : list;

    // Orden: primero los que deben más
    return bySearch.sort((a, b) => b.totalDeuda - a.totalDeuda);
  }, [fiados, search]);

  const profiles = useMemo(() => {
    if (statusFilter === "todos") return allProfiles;
    if (statusFilter === "pagados") return allProfiles.filter((p) => p.estadoGeneral === "PAGADO_TOTAL");
    if (statusFilter === "parcial") return allProfiles.filter((p) => p.estadoGeneral === "PAGADO_PARCIAL");
    // "activos" = pendiente + parcial
    return allProfiles.filter((p) => p.estadoGeneral !== "PAGADO_TOTAL");
  }, [allProfiles, statusFilter]);

  // Refrescar el perfil seleccionado cuando cambian los datos
  useEffect(() => {
    if (selectedProfile) {
      const updated = profiles.find((p) => p.cliente.id === selectedProfile.cliente.id);
      setSelectedProfile(updated ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles]);

  // ─── Abonar ──────────────────────────────────────────────────────────────
  async function handleAbonar() {
    if (!activeFiado || !abonoAmount || Number(abonoAmount) <= 0) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/fiados/${activeFiado.id}/abonos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: Number(abonoAmount), metodoPago }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Abono registrado correctamente");
        setActiveFiado(null);
        setAbonoAmount("");
        setMetodoPago("EFECTIVO");
        void loadFiados();
      } else {
        toast.error(data.error || "Error al registrar el abono");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Estadísticas globales (siempre sobre TODOS los clientes) ────────────────
  const globalStats = useMemo(() => {
    const totalDeuda = allProfiles.reduce((a, p) => a + p.totalDeuda, 0);
    const clientesActivos = allProfiles.filter((p) => p.estadoGeneral !== "PAGADO_TOTAL").length;
    const totalClientes = allProfiles.length;
    return { totalDeuda, clientesActivos, totalClientes };
  }, [allProfiles]);

  const tabOptions = [
    { key: "activos" as const, label: "Con deuda", count: allProfiles.filter((p) => p.estadoGeneral !== "PAGADO_TOTAL").length },
    { key: "parcial" as const, label: "Parcial",   count: allProfiles.filter((p) => p.estadoGeneral === "PAGADO_PARCIAL").length },
    { key: "pagados" as const, label: "Pagados",   count: allProfiles.filter((p) => p.estadoGeneral === "PAGADO_TOTAL").length },
    { key: "todos"   as const, label: "Todos",     count: allProfiles.length },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <BookUser className="text-primary-600" />
              Fiados y Cuentas
            </h1>
            <p className="text-sm text-slate-500 font-bold mt-1">
              Gestiona las cuentas por cliente. Toca un perfil para ver sus deudas.
            </p>
          </div>

          {/* Búsqueda */}
          <div className="relative max-w-xs w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-semibold focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Resumen global */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Deuda Total</p>
            <p className="text-base font-black text-amber-700 mt-0.5">{formatCurrency(globalStats.totalDeuda)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Clientes</p>
            <p className="text-base font-black text-slate-800 mt-0.5">{globalStats.totalClientes}</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Con Deuda</p>
            <p className="text-base font-black text-rose-700 mt-0.5">{globalStats.clientesActivos}</p>
          </div>
        </div>

        {/* Tabs de filtro */}
        <div className="flex gap-2 flex-wrap border-t border-slate-100 pt-4">
          {tabOptions.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border ${
                statusFilter === tab.key
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Lista de perfiles ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="bg-white p-14 rounded-2xl border border-slate-200 text-center">
          <Receipt className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-black text-slate-600">No hay fiados registrados</p>
          <p className="text-slate-400 text-sm mt-1">
            {search ? "Prueba con otro nombre." : "Cuando realices ventas a crédito aparecerán aquí."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const { cliente, totalDeuda, totalOriginal, totalPagado, fiadosActivos, estadoGeneral } = profile;
            const isPagado = estadoGeneral === "PAGADO_TOTAL";
            const isParcial = estadoGeneral === "PAGADO_PARCIAL";
            const porcentajePagado = totalOriginal > 0 ? (totalPagado / totalOriginal) * 100 : 0;

            return (
              <button
                key={cliente.id}
                onClick={() => {
                  setSelectedProfile(profile);
                  setDrawerFilter("activos");
                }}
                className={`w-full text-left bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all group ${
                  isPagado
                    ? "border-emerald-200 hover:border-emerald-400"
                    : isParcial
                    ? "border-blue-200 hover:border-blue-400"
                    : "border-amber-200 hover:border-amber-400"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(cliente.nombre)} flex items-center justify-center text-white text-sm font-black shadow-md`}>
                    {getInitials(cliente.nombre)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-black text-slate-900 text-base truncate">{cliente.nombre}</h3>
                      <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-slate-600 transition" />
                    </div>

                    {cliente.telefono && (
                      <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {cliente.telefono}
                      </p>
                    )}

                    {/* Badge de estado */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {isPagado ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={9} /> Todo pagado
                        </span>
                      ) : isParcial ? (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                          <TrendingUp size={9} /> Abono parcial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                          <Clock size={9} /> Pendiente
                        </span>
                      )}
                      {fiadosActivos > 0 && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                          <AlertCircle size={9} /> {fiadosActivos} deuda{fiadosActivos > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deuda total */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Saldo pendiente</p>
                      <p className={`text-xl font-black mt-0.5 ${isPagado ? "text-emerald-600" : "text-amber-600"}`}>
                        {formatCurrency(totalDeuda)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400">Pagado</p>
                      <p className="text-sm font-black text-slate-600 mt-0.5">{formatCurrency(totalPagado)}</p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  {totalOriginal > 0 && (
                    <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isPagado ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Panel lateral (Drawer) ────────────────────────────────────────── */}
      {selectedProfile && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedProfile(null)}
          />

          {/* Drawer content */}
          <div className="relative h-[100dvh] w-full max-w-lg bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Cabecera del drawer */}
            <div className={`p-4 sm:p-6 bg-gradient-to-br ${avatarColor(selectedProfile.cliente.nombre)} text-white`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-black">
                    {getInitials(selectedProfile.cliente.nombre)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{selectedProfile.cliente.nombre}</h2>
                    {selectedProfile.cliente.telefono && (
                      <p className="text-sm opacity-80 flex items-center gap-1 mt-0.5">
                        <Phone size={12} /> {selectedProfile.cliente.telefono}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Resumen del cliente */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
                <div className="bg-white/15 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-black uppercase opacity-70">Total Deuda</p>
                  <p className="text-sm font-black mt-0.5">{formatCurrency(selectedProfile.totalDeuda)}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-black uppercase opacity-70">Pagado</p>
                  <p className="text-sm font-black mt-0.5">{formatCurrency(selectedProfile.totalPagado)}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-black uppercase opacity-70">Fiados</p>
                  <p className="text-sm font-black mt-0.5">{selectedProfile.fiados.length}</p>
                </div>
              </div>
            </div>

            {/* Lista de fiados del cliente */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Historial de fiados
                </p>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setDrawerFilter("activos")}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                      drawerFilter === "activos"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Pendientes
                  </button>
                  <button
                    onClick={() => setDrawerFilter("todos")}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                      drawerFilter === "todos"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Todos
                  </button>
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {selectedProfile.fiados
                  .filter((f) => drawerFilter === "todos" || f.estado !== "PAGADO_TOTAL")
                  .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
                  .map((fiado) => {
                  const saldo = Number(fiado.montoTotal) - Number(fiado.montoPagado);
                  const isPagado = fiado.estado === "PAGADO_TOTAL";

                  return (
                    <div
                      key={fiado.id}
                      className={`rounded-2xl border p-4 ${isPagado ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}
                    >
                      {/* Cabecera del fiado */}
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-black text-slate-400">{formatDate(fiado.fechaCreacion)}</p>
                        {isPagado ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> Pagado
                          </span>
                        ) : (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${fiado.estado === "PAGADO_PARCIAL" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                            {fiado.estado === "PAGADO_PARCIAL" ? "Abono parcial" : "Pendiente"}
                          </span>
                        )}
                      </div>

                      {/* Productos */}
                      {fiado.transaccion?.ventas && fiado.transaccion.ventas.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Productos</p>
                          {fiado.transaccion.ventas.map((v) => (
                            <p key={v.id} className="text-xs text-slate-700 font-semibold">
                              • {v.producto.nombre}
                              <span className="text-slate-400 ml-1">(×{v.cantidad})</span>
                            </p>
                          ))}
                        </div>
                      )}

                      {fiado.notas && (
                        <p className="text-xs italic text-slate-400 mb-3">📝 {fiado.notas}</p>
                      )}

                      {/* Montos */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Saldo</p>
                          <p className={`text-lg font-black ${isPagado ? "text-emerald-600" : "text-amber-600"}`}>
                            {formatCurrency(saldo)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            de {formatCurrency(fiado.montoTotal)}
                          </p>
                        </div>

                        {!isPagado && (
                          <button
                            onClick={() => { setActiveFiado(fiado); setAbonoAmount(""); }}
                            className="flex items-center gap-1.5 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-black hover:bg-slate-800 transition active:scale-95"
                          >
                            <CircleDollarSign size={15} />
                            Abonar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {selectedProfile.fiados.filter((f) => drawerFilter === "todos" || f.estado !== "PAGADO_TOTAL").length === 0 && (
                  <div className="text-center py-10 px-4">
                    <p className="text-sm font-bold text-slate-400">No hay fiados en esta categoría.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Abono ────────────────────────────────────────────────── */}
      {activeFiado && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <CircleDollarSign className="text-primary-600" />
                Registrar Abono
              </h3>
              <button
                onClick={() => setActiveFiado(null)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl mb-5 border border-slate-100 space-y-1.5">
              <p className="text-xs font-bold text-slate-400">Cliente</p>
              <p className="text-lg font-black text-slate-900">{activeFiado.cliente.nombre}</p>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-500">Monto original:</span>
                <span className="font-black text-slate-800">{formatCurrency(activeFiado.montoTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-slate-500">Ya pagado:</span>
                <span className="font-black text-emerald-600">{formatCurrency(activeFiado.montoPagado)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-slate-200">
                <span className="font-black text-slate-900">Saldo pendiente:</span>
                <span className="font-black text-amber-600">
                  {formatCurrency(Number(activeFiado.montoTotal) - Number(activeFiado.montoPagado))}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-black uppercase text-slate-500 mb-2">
                Monto a pagar hoy
              </label>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                <input
                  type="number"
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl py-3.5 pl-8 pr-4 text-2xl font-black focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
                  placeholder="0"
                  autoFocus
                />
              </div>

              <label className="block text-xs font-black uppercase text-slate-500 mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMetodoPago("EFECTIVO")}
                  className={`py-2 rounded-xl border text-xs font-black transition-all ${
                    metodoPago === "EFECTIVO"
                      ? "bg-slate-900 border-slate-900 text-white shadow-md"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  💵 Efectivo
                </button>
                <button
                  onClick={() => setMetodoPago("NEQUI")}
                  className={`py-2 rounded-xl border text-xs font-black transition-all ${
                    metodoPago === "NEQUI"
                      ? "bg-fuchsia-600 border-fuchsia-600 text-white shadow-md"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  📱 Nequi
                </button>
                <button
                  onClick={() => setMetodoPago("BANCOLOMBIA")}
                  className={`py-2 rounded-xl border text-xs font-black transition-all ${
                    metodoPago === "BANCOLOMBIA"
                      ? "bg-blue-600 border-blue-600 text-white shadow-md"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  🏦 Bancol.
                </button>
              </div>
            </div>

            <button
              onClick={handleAbonar}
              disabled={
                isSubmitting ||
                !abonoAmount ||
                Number(abonoAmount) <= 0 ||
                Number(abonoAmount) > Number(activeFiado.montoTotal) - Number(activeFiado.montoPagado)
              }
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3.5 font-black text-lg flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  <PlusCircle size={20} strokeWidth={2.5} />
                  Guardar Pago
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
