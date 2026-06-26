"use client";

import { useEffect, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Calculator,
  Calendar,
  History,
  Banknote,
  Smartphone,
  Building2,
  BookOpen,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
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
    <div className={`rounded-2xl border p-3 sm:p-4 flex items-center gap-2 sm:gap-3 ${colorClass}`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider opacity-70 truncate">{label}</p>
        <p className="text-base sm:text-xl font-black mt-0.5 truncate">{formatCurrency(value)}</p>
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
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const previewRef = useRef<HTMLDivElement>(null);

  // ─── Fetch Preview ───────────────────────────────────────────────────
  async function fetchPreview() {
    setLoadingPreview(true);
    try {
      let url = "/api/cierre-caja?preview=true";
      if (startDate && endDate) {
        const start = startDate.toISOString().split("T")[0];
        const end = endDate.toISOString().split("T")[0];
        url += `&start=${start}&end=${end}`;
      }
      const res = await fetch(url);
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

  // ─── Fetch History ───────────────────────────────────────────────────
  async function fetchHistory(page: number, size: number) {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/cierre-caja?page=${page}&size=${size}`);
      if (!res.ok) throw new Error("No se pudo cargar el historial.");
      const json = await res.json();
      // Support both paginated {data, meta} and plain array responses
      if (Array.isArray(json)) {
        setHistory(json);
        setTotalPages(1);
        setTotalRecords(json.length);
      } else {
        setHistory(json.data ?? []);
        setCurrentPage(json.meta?.page ?? page);
        setTotalPages(json.meta?.totalPages ?? 1);
        setTotalRecords(json.meta?.totalRecords ?? 0);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar el historial de cierres.");
    } finally {
      setLoadingHistory(false);
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────
  useEffect(() => {
    void fetchPreview();
    if (rol === "ADMIN") {
      void fetchHistory(1, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  // ─── Refetch when page/size changes ─────────────────────────────────
  useEffect(() => {
    if (rol === "ADMIN") {
      void fetchHistory(currentPage, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  // ─── PDF ─────────────────────────────────────────────────────────────
  async function handleGeneratePDF() {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("corte-dia.pdf");
  }

  // ─── Cerrar Caja ─────────────────────────────────────────────────────
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
      if (rol === "ADMIN") await fetchHistory(1, pageSize);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo realizar el cierre.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">

      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-200">
            <Calculator size={24} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-primary-700">
              Operaciones de caja
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Cierre de Caja
            </h1>
          </div>
        </div>
        <p className="mt-2 text-base text-slate-600">
          Realiza el corte del día y obtén el desglose por método de pago.
        </p>
      </header>

      {/* ── Filtros de fecha + PDF ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {rol === "ADMIN" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Desde</label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Fecha inicio"
                dateFormat="dd/MM/yyyy"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hasta</label>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate ?? undefined}
                placeholderText="Fecha fin"
                dateFormat="dd/MM/yyyy"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </>
        )}
        {rol === "ADMIN" && (
          <button
            onClick={() => void fetchPreview()}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 transition"
          >
            <Search size={16} />
            Buscar
          </button>
        )}
        {preview && (
          <button
            onClick={handleGeneratePDF}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900 transition ml-auto"
          >
            <Download size={16} />
            Descargar PDF
          </button>
        )}
      </div>

      {/* ── Grid Principal + Reglas ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Panel Principal */}
        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-800 mb-4">
            <Calendar className="text-primary-600" size={20} />
            {rol === "ADMIN" ? "Corte del Período" : "Cierre del Día"}
          </h2>
          <div className="h-px bg-slate-100 mb-5" />

          <div ref={previewRef}>
            {loadingPreview ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
                <p className="mt-4 text-sm font-medium text-slate-500">Calculando ventas...</p>
              </div>
            ) : preview ? (
              <div className="space-y-5">

                {/* Gran Total */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-teal-800 p-5 sm:p-6 text-white shadow-lg shadow-primary-100">
                  <div className="absolute -right-8 -bottom-8 opacity-10">
                    <TrendingUp size={160} />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary-100">
                    Total Vendido
                  </p>
                  <p className="mt-1 text-4xl sm:text-5xl font-black tracking-tight break-all">
                    {formatCurrency(preview.totalVentas)}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-primary-100/80">
                    {preview.numeroTransacciones} transacciones registradas
                  </p>
                </div>

                {/* Desglose */}
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

                {/* Botón cerrar caja */}
                {preview.numeroTransacciones > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => void handleCerrarCaja()}
                      disabled={submitting}
                      className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary-200 hover:bg-primary-700 disabled:opacity-60 transition"
                    >
                      {submitting ? "Guardando cierre..." : "Confirmar y Cerrar Caja"}
                    </button>
                    <p className="mt-2 text-center text-xs text-slate-500">
                      Esta acción guarda un snapshot permanente con el desglose por método.
                    </p>
                  </div>
                )}

                {preview.numeroTransacciones === 0 && (
                  <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800">
                    <p className="font-bold">No se encontraron ventas para el período seleccionado.</p>
                    <p className="text-sm mt-1">Registra ventas o ajusta el rango de fechas.</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {/* Panel Reglas */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-800">Reglas de Cierre</h3>
          <div className="h-px bg-slate-100 mt-2 mb-4" />
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
              <span>Se suman todas las transacciones del período seleccionado.</span>
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

      {/* ── Historial de Cierres (solo ADMIN) ──────────────────────────── */}
      {rol === "ADMIN" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">

          {/* Cabecera historial */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <History className="text-slate-700" size={22} />
              <h2 className="text-xl font-extrabold text-slate-800">Historial de Cierres</h2>
              {totalRecords > 0 && (
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                  {totalRecords} total
                </span>
              )}
            </div>

            {/* Selector de filas por página */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500">Filas por página:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="h-px bg-slate-100 mb-5" />

          {/* Tabla */}
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
              <p className="mt-4 text-sm font-medium text-slate-500">Cargando historial...</p>
            </div>
          ) : history.length > 0 ? (
            <>
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

              {/* ── Controles de paginación ── */}
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Mostrando página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                  {totalRecords > 0 && <> &middot; {totalRecords} registros en total</>}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage <= 1}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </button>

                  {/* Número de páginas */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page = i + 1;
                      if (totalPages > 5) {
                        const start = Math.max(1, currentPage - 2);
                        page = Math.min(start + i, totalPages - (4 - i));
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 rounded-lg text-sm font-bold transition ${
                            currentPage === page
                              ? "bg-primary-600 text-white shadow"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
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
  );
}
