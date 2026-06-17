"use client";

import { useEffect, useState } from "react";
import { Calculator, Calendar, DollarSign, History, ShieldCheck, User } from "lucide-react";
import toast from "react-hot-toast";

type CierrePreview = {
  fecha: string;
  totalVentas: number;
  totalEfectivoEsperado: number;
  numeroTransacciones: number;
  usuario: { nombre: string };
};

type CierreHistorial = {
  id: string;
  fecha: string;
  totalVentas: number;
  totalEfectivoEsperado: number;
  numeroTransacciones: number;
  usuario: {
    nombre: string;
    rol: string;
  };
};

type Props = {
  rol: "ADMIN" | "VENDEDOR";
};

export function CierreCajaClient({ rol }: Props) {
  const [preview, setPreview] = useState<CierrePreview | null>(null);
  const [history, setHistory] = useState<CierreHistorial[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(rol === "ADMIN");
  const [submitting, setSubmitting] = useState(false);

  // Cargar previsualización de hoy
  async function fetchPreview() {
    try {
      const response = await fetch("/api/cierre-caja?preview=true");
      if (!response.ok) {
        throw new Error("No se pudo cargar la previsualización.");
      }
      const data = await response.json();
      setPreview(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar la previsualización del día.");
    } finally {
      setPreview(null); // default fallback
      setLoadingPreview(false);
    }
  }

  // Cargar historial si es administrador
  async function fetchHistory() {
    try {
      const response = await fetch("/api/cierre-caja");
      if (!response.ok) {
        throw new Error("No se pudo cargar el historial.");
      }
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar el historial de cierres.");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    // Para la previsualización, obtenemos los datos
    async function loadInitialData() {
      try {
        const resPreview = await fetch("/api/cierre-caja?preview=true");
        if (resPreview.ok) {
          const data = await resPreview.json();
          setPreview(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPreview(false);
      }

      if (rol === "ADMIN") {
        await fetchHistory();
      }
    }
    loadInitialData();
  }, [rol]);

  async function handleCerrarCaja() {
    if (!preview) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas realizar el cierre de caja por un total de $${preview.totalVentas.toLocaleString()} hoy?`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/cierre-caja", {
        method: "POST",
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Error al realizar el cierre.");
      }

      toast.success("¡Cierre de caja realizado y guardado con éxito!");
      
      // Recargar datos
      await fetchPreview();
      if (rol === "ADMIN") {
        await fetchHistory();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo realizar el cierre de caja.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Encabezado */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <Calculator size={24} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                Operaciones de caja
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Cierre de Caja Diario
              </h1>
            </div>
          </div>
          <p className="mt-2 text-base text-slate-600">
            Realiza el corte de caja del día de hoy y genera un snapshot de las ventas y transacciones actuales.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Card Principal de Cierre */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md lg:col-span-2">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-800">
              <Calendar className="text-emerald-600" size={20} />
              Corte del Día Actual
            </h2>
            <div className="mt-2 h-px bg-slate-100" />

            {loadingPreview ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                <p className="mt-4 text-sm font-medium text-slate-500">Calculando ventas del día...</p>
              </div>
            ) : preview ? (
              <div className="mt-6 space-y-6">
                {/* Gran Total */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 p-6 text-white shadow-lg shadow-emerald-100">
                  <div className="absolute -right-6 -bottom-6 opacity-10">
                    <DollarSign size={160} />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-100">
                    Total Efectivo Esperado
                  </p>
                  <p className="mt-1 text-5xl font-black tracking-tight">
                    ${preview.totalVentas.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-emerald-100/80">
                    * Calculado en base a {preview.numeroTransacciones} transacciones registradas hoy.
                  </p>
                </div>

                {/* Métricas secundarias */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <History size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Transacciones
                        </p>
                        <p className="text-lg font-black text-slate-800">
                          {preview.numeroTransacciones} ventas
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Responsable
                        </p>
                        <p className="text-lg font-black text-slate-800">
                          {preview.usuario.nombre}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón de cierre */}
                <div className="pt-4">
                  <button
                    onClick={handleCerrarCaja}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        <span>Guardando snapshot...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={22} />
                        <span>Confirmar y Cerrar Caja</span>
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Esta acción guardará un corte permanente en los logs y la base de datos para auditorías.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-800">
                <p className="font-semibold">No se encontraron ventas para procesar el día de hoy.</p>
                <p className="text-sm mt-1">Registra ventas en el módulo del vendedor antes de intentar cerrar la caja.</p>
              </div>
            )}
          </section>

          {/* Panel Lateral Informativo */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-extrabold text-slate-800">Reglas de Cierre</h3>
            <div className="mt-2 h-px bg-slate-100" />
            
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>El cierre de caja suma todas las ventas realizadas desde las 00:00 del día de hoy.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>Asume que todo el dinero recaudado es en **efectivo**, dado el formato casero del negocio.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>Tanto vendedores como administradores pueden cerrar caja, pero cada cierre quedará auditado con el usuario responsable.</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Historial de cierres para Administrador */}
        {rol === "ADMIN" && (
          <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <History className="text-slate-700" size={22} />
              <h2 className="text-xl font-extrabold text-slate-800">Historial de Cierres de Caja</h2>
            </div>
            <div className="mt-2 h-px bg-slate-100" />

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
                <p className="mt-4 text-sm font-medium text-slate-500">Cargando historial...</p>
              </div>
            ) : history.length > 0 ? (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4 rounded-l-lg">Fecha y Hora</th>
                      <th className="px-6 py-4">Responsable</th>
                      <th className="px-6 py-4">Transacciones</th>
                      <th className="px-6 py-4 rounded-r-lg text-right">Total Ventas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((cierre) => (
                      <tr key={cierre.id} className="hover:bg-slate-50/55 transition">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {new Date(cierre.fecha).toLocaleString("es-CO")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{cierre.usuario.nombre}</span>
                            <span className="text-xs text-slate-400 capitalize">{cierre.usuario.rol.toLowerCase()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">
                          {cierre.numeroTransacciones} ventas
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-950">
                          ${cierre.totalVentas.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-sm text-slate-500 font-medium">Aún no se han guardado cierres de caja en el sistema.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
