"use client";

import { useEffect, useState } from "react";
import {
  Calculator,
  Calendar,
  History,
  ShieldCheck,
  User,
  Banknote,
  Smartphone,
  Building2,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────
type CierrePreview = {
  fecha: string;
  totalVentas: number;
  totalEfectivo: number;
  totalNequi: number;
  totalBancolombia: number;
  totalFiado: number;
  numeroTransacciones: number;
  usuario: { nombre: string };
};

type CierreHistorial = {
  id: string;
  fecha: string;
  totalVentas: number;
  totalEfectivo: number;
  totalNequi: number;
  totalBancolombia: number;
  totalFiado: number;
  numeroTransacciones: number;
  usuario: { nombre: string; rol: string };
};

type Props = { rol: "ADMIN" | "VENDEDOR" };

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

// Tarjeta de método de pago para el desglose
function MetodoCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${colorClass}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-black uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-xl font-black mt-0.5">{formatCurrency(value)}</p>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────
export function CierreCajaClient({ rol }: Props) {
  const [preview, setPreview] = useState<CierrePreview | null>(null);
  const [history, setHistory] = useState<CierreHistorial[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(rol === "ADMIN");
  const [submitting, setSubmitting] = useState(false);

  async function fetchPreview() {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/cierre-caja?preview=true");
      if (!res.ok) throw new Error("No se pudo cargar la previsualización.");
      const data = await res.json();
      setPreview(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar la previsualización del día.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch("/api/cierre-caja");
      if (!res.ok) throw new Error("No se pudo cargar el historial.");
      const data = await res.json();
      setHistory(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar el historial de cierres.");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    async function init() {
      await fetchPreview();
      if (rol === "ADMIN") await fetchHistory();
    }
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  async function handleCerrarCaja() {
    if (!preview) return;
    const confirmed = window.confirm(
      `¿Confirmas el cierre de caja por ${formatCurrency(preview.totalVentas)} del día de hoy?`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/cierre-caja", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al realizar el cierre.");
      }
      toast.success("¡Cierre de caja realizado y guardado con éxito!");
      await fetchPreview();
      if (rol === "ADMIN") await fetchHistory();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo realizar el cierre.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-200">
              <Calculator size={24} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-primary-700">
                Operaciones de caja
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Cierre de Caja Diario
              </h1>
            </div>
          </div>
          <p className="mt-2 text-base text-slate-600">
            Realiza el corte del día y obtén el desglose por método de pago.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Panel Principal ──────────────────────────────────────── */}
          <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-800 mb-4">
              <Calendar className="text-primary-600" size={20} />
              Corte del Día Actual
            </h2>
            <div className="h-px bg-slate-100 mb-5" />

            {loadingPreview ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
                <p className="mt-4 text-sm font-medium text-slate-500">Calculando ventas del día...</p>
              </div>
            ) : preview ? (
              <div className="space-y-5">

                {/* Gran Total */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-teal-800 p-5 sm:p-6 text-white shadow-lg shadow-primary-100">
                  <div className="absolute -right-8 -bottom-8 opacity-10">
                    <TrendingUp size={160} />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary-100">
                    Total Vendido Hoy
                  </p>
                  <p className="mt-1 text-4xl sm:text-5xl font-black tracking-tight break-all">
                    {formatCurrency(preview.totalVentas)}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-primary-100/80">
                    {preview.numeroTransacciones} transacciones registradas
                  </p>
                </div>

                {/* Desglose por método de pago */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                    Desglose por Método de Pago
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <MetodoCard
                      icon={<Banknote size={22} className="text-emerald-700" />}
                      label="Efectivo"
                      value={preview.totalEfectivo}
                      colorClass="border-emerald-200 bg-emerald-50 text-emerald-900"
                    />
                    <MetodoCard
                      icon={<Smartphone size={22} className="text-purple-700" />}
                      label="Nequi"
                      value={preview.totalNequi}
                      colorClass="border-purple-200 bg-purple-50 text-purple-900"
                    />
                    <MetodoCard
                      icon={<Building2 size={22} className="text-blue-700" />}
                      label="Bancolombia"
                      value={preview.totalBancolombia}
                      colorClass="border-blue-200 bg-blue-50 text-blue-900"
                    />
                    <MetodoCard
                      icon={<BookOpen size={22} className="text-amber-700" />}
                      label="Fiado"
                      value={preview.totalFiado}
                      colorClass="border-amber-200 bg-amber-50 text-amber-900"
                    />
                  </div>
                </div>

                {/* Info del responsable y fecha */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-700">
                      <History size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Transacciones
                      </p>
                      <p className="text-lg font-black text-slate-800">
                        {preview.numeroTransacciones} ventas
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-700">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Responsable
                      </p>
                      <p className="text-lg font-black text-slate-800">{preview.usuario.nombre}</p>
                    </div>
                  </div>
                </div>

                {/* Botón cerrar caja */}
                <div className="pt-2">
                  <button
                    onClick={handleCerrarCaja}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        <span>Guardando cierre...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={22} />
                        <span>Confirmar y Cerrar Caja</span>
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Esta acción guarda un snapshot permanente con el desglose por método.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800">
                <p className="font-bold">No se encontraron ventas para el día de hoy.</p>
                <p className="text-sm mt-1">Registra ventas antes de cerrar la caja.</p>
              </div>
            )}
          </section>

          {/* ── Panel Lateral Reglas ──────────────────────────────────── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-extrabold text-slate-800">Reglas de Cierre</h3>
            <div className="h-px bg-slate-100 mt-2 mb-4" />
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                <span>Se suman todas las transacciones del día desde las 00:00.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                <span>El desglose separa Efectivo, Nequi, Bancolombia y Fiado.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                <span>El dinero fiado NO se cuenta como efectivo recaudado.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                <span>Cada cierre queda auditado con el responsable que lo realizó.</span>
              </li>
            </ul>
          </section>
        </div>

        {/* ── Historial de Cierres (solo ADMIN) ────────────────────────── */}
        {rol === "ADMIN" && (
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <History className="text-slate-700" size={22} />
              <h2 className="text-xl font-extrabold text-slate-800">Historial de Cierres de Caja</h2>
            </div>
            <div className="h-px bg-slate-100 mb-5" />

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
                <p className="mt-4 text-sm font-medium text-slate-500">Cargando historial...</p>
              </div>
            ) : history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left rounded-l-lg">Fecha</th>
                      <th className="px-4 py-3 text-left">Responsable</th>
                      <th className="px-4 py-3 text-right hidden sm:table-cell">💵 Efectivo</th>
                      <th className="px-4 py-3 text-right hidden md:table-cell">📱 Nequi</th>
                      <th className="px-4 py-3 text-right hidden lg:table-cell">🏦 Bancolombia</th>
                      <th className="px-4 py-3 text-right hidden md:table-cell">📒 Fiado</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((cierre) => (
                      <tr key={cierre.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {new Date(cierre.fecha).toLocaleDateString("es-CO")}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {new Date(cierre.fecha).toLocaleTimeString("es-CO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="block font-medium text-slate-800">{cierre.usuario.nombre}</span>
                          <span className="text-xs text-slate-400 capitalize">{cierre.usuario.rol.toLowerCase()}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 hidden sm:table-cell">
                          {formatCurrency(cierre.totalEfectivo)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-purple-700 hidden md:table-cell">
                          {formatCurrency(cierre.totalNequi)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700 hidden lg:table-cell">
                          {formatCurrency(cierre.totalBancolombia)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-700 hidden md:table-cell">
                          {formatCurrency(cierre.totalFiado)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">
                          {formatCurrency(cierre.totalVentas)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-sm text-slate-500 font-medium">
                  Aún no se han guardado cierres de caja.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
