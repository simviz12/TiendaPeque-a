"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Receipt, Package } from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────
type VentaItem = {
  id: string;
  cantidad: number;
  precioUnitario: string;
  total: string;
  producto: {
    nombre: string;
    categoria: { nombre: string };
  };
};

type Fiado = {
  id: string;
  montoTotal: string;
  estado: string;
  cliente: { nombre: string };
};

type Transaccion = {
  id: string;
  fecha: string;
  total: string;
  pagoEfectivo: string;
  pagoNequi: string;
  pagoBancolombia: string;
  pagoFiado: string;
  ventas: VentaItem[];
  fiado: Fiado | null;
  vendedor: { nombre: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Badges de método de pago
function PaymentBadges({ t }: { t: Transaccion }) {
  const badges = [];
  if (Number(t.pagoEfectivo) > 0)
    badges.push({ label: `💵 ${formatCurrency(t.pagoEfectivo)}`, cls: "bg-emerald-100 text-emerald-800" });
  if (Number(t.pagoNequi) > 0)
    badges.push({ label: `📱 ${formatCurrency(t.pagoNequi)}`, cls: "bg-purple-100 text-purple-800" });
  if (Number(t.pagoBancolombia) > 0)
    badges.push({ label: `🏦 ${formatCurrency(t.pagoBancolombia)}`, cls: "bg-blue-100 text-blue-800" });
  if (Number(t.pagoFiado) > 0)
    badges.push({ label: `📒 ${formatCurrency(t.pagoFiado)}`, cls: "bg-amber-100 text-amber-800" });
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => (
        <span key={i} className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${b.cls}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────
export function SalesHistoryClient() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Date filter states
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  async function loadSales() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ventas");
      const data = (await response.json()) as {
        data?: Transaccion[];
        message?: string;
      };

      if (!response.ok || !data.data) {
        toast.error(data.message ?? "No se pudo cargar el historial.");
        return;
      }
      setTransacciones(data.data);
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadSales(); }, []);

  // Resumen filtrado por fechas
  const filteredTransacciones = useMemo(() => {
    if (!filterStartDate && !filterEndDate) return transacciones;
    return transacciones.filter((t) => {
      // Comparar sólo la parte de fecha (YYYY-MM-DD) para evitar bugs de zona horaria
      const tDay = t.fecha.slice(0, 10); // "YYYY-MM-DD"
      if (filterStartDate && tDay < filterStartDate) return false;
      if (filterEndDate && tDay > filterEndDate) return false;
      return true;
    });
  }, [transacciones, filterStartDate, filterEndDate]);

  const summary = useMemo(() => {
    const today = startOfDay(new Date());
    const sevenDaysAgo = startOfDay(new Date());
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    return filteredTransacciones.reduce(
      (acc, t) => {
        const d = new Date(t.fecha);
        const total = Number(t.total);
        if (d >= today) acc.today += total;
        if (d >= sevenDaysAgo) acc.week += total;
        return acc;
      },
      { today: 0, week: 0 },
    );
  }, [filteredTransacciones]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

        {/* Encabezado */}
        <header className="border-b border-slate-200 pb-6 mb-6">
          <p className="text-sm font-black uppercase tracking-wide text-primary-700">Vendedor</p>
          <h1 className="mt-1 text-4xl font-black text-slate-900">Mi Historial</h1>
          <p className="mt-2 text-base text-slate-600">
            Revisa tus transacciones recientes y los totales del día.
          </p>
        </header>

        {/* Date filter toolbar */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <label className="block text-xs font-black uppercase text-slate-500 mb-1" htmlFor="start-date">Fecha inicio</label>
            <input
              id="start-date"
              type="date"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-200 transition"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              aria-label="Fecha de inicio"
            />
          </div>
          <div className="relative flex-1">
            <label className="block text-xs font-black uppercase text-slate-500 mb-1" htmlFor="end-date">Fecha fin</label>
            <input
              id="end-date"
              type="date"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-200 transition"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              aria-label="Fecha de fin"
            />
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wider text-slate-500">Vendido hoy</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{formatCurrency(summary.today)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wider text-slate-500">Últimos 7 días</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{formatCurrency(summary.week)}</p>
          </article>
        </div>

        {/* Lista de transacciones */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-primary-600" />
              <h2 className="font-black text-slate-900">Transacciones</h2>
            </div>
            {/* Indicador de filtro activo */}
            {(filterStartDate || filterEndDate) ? (
              <span className="rounded-full bg-primary-100 text-primary-700 text-xs font-black px-3 py-1">
                🔍 Mostrando {filteredTransacciones.length} de {transacciones.length} ventas
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400">
                {transacciones.length} ventas en total
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
              <p className="mt-4 font-bold text-slate-500">Cargando historial...</p>
            </div>
          ) : transacciones.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-black text-slate-500">Todavía no tienes ventas registradas.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTransacciones.map((t) => {
                const isOpen = expanded.has(t.id);
                const numItems = t.ventas.reduce((a, v) => a + v.cantidad, 0);

                return (
                  <div key={t.id}>
                    {/* Fila de la transacción */}
                    <button
                      onClick={() => toggleExpand(t.id)}
                      type="button"
                      className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition text-left group"
                    >
                      {/* Icono expand */}
                      <span className="shrink-0 text-slate-400 group-hover:text-primary-600 transition">
                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </span>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-black text-slate-900">
                            {formatDate(t.fecha)}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {numItems} producto(s)
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <PaymentBadges t={t} />
                        </div>
                      </div>

                      {/* Total */}
                      <span className="shrink-0 text-lg font-black text-slate-900">
                        {formatCurrency(t.total)}
                      </span>
                    </button>

                    {/* Detalle expandido */}
                    {isOpen && (
                      <div className="bg-slate-50 border-t border-slate-100 px-5 py-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                          <Package size={12} className="inline mr-1" />
                          Productos en esta orden
                        </p>
                        <div className="space-y-2">
                          {t.ventas.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-black text-slate-900">
                                  {item.producto.nombre}
                                </p>
                                <p className="text-xs font-bold text-slate-400 mt-0.5">
                                  {item.producto.categoria.nombre} ·{" "}
                                  {item.cantidad} × {formatCurrency(item.precioUnitario)}
                                </p>
                              </div>
                              <span className="text-sm font-black text-primary-700">
                                {formatCurrency(item.total)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Info fiado si aplica */}
                        {t.fiado && (
                          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                            <p className="text-xs font-black text-amber-800">
                              📒 Fiado — Cliente:{" "}
                              <span className="font-black">{t.fiado.cliente.nombre}</span>
                            </p>
                            <p className="text-xs font-bold text-amber-700 mt-0.5">
                              Monto fiado: {formatCurrency(t.fiado.montoTotal)} ·{" "}
                              Estado:{" "}
                              <span className={
                                t.fiado.estado === "PAGADO_TOTAL"
                                  ? "text-green-700"
                                  : t.fiado.estado === "PAGADO_PARCIAL"
                                  ? "text-blue-700"
                                  : "text-red-700"
                              }>
                                {t.fiado.estado.replace("_", " ")}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
    </div>
  );
}
