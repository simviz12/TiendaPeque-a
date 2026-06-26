"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Download,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────
type VentaItem = {
  id: string;
  cantidad: number;
  precioUnitario: string;
  total: string;
  producto: {
    nombre: string;
    precio: string;
    categoria: { nombre: string };
  };
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
  fiado: { cliente: { nombre: string }; montoTotal: string; estado: string } | null;
  vendedor: { id: string; nombre: string; usuario: string };
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
    <div className="flex flex-wrap gap-1">
      {badges.map((b, i) => (
        <span key={i} className={`rounded-full px-2 py-0.5 text-[10px] font-black ${b.cls}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────
export function SalesAdminClient() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [serverTotales, setServerTotales] = useState<{
    totalRecaudado: number;
    totalTransacciones: number;
  } | null>(null);

  // Filters
  const [productSearch, setProductSearch] = useState("");
  const [sellerFilter, setSellerFilter] = useState("todos");
  const [timeFilter, setTimeFilter] = useState("todos");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // ─── Build API params ────────────────────────────────────────────────
  function buildParams(
    page: number,
    size: number,
    tf?: string,
    start?: string,
    end?: string,
    seller?: string,
  ) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", String(size));

    const resolvedStart = start ?? customStartDate;
    const resolvedEnd = end ?? customEndDate;
    const resolvedTf = tf ?? timeFilter;

    if (resolvedStart || resolvedEnd) {
      if (resolvedStart) params.set("from", new Date(resolvedStart).toISOString());
      if (resolvedEnd) {
        const endDate = new Date(resolvedEnd);
        endDate.setHours(23, 59, 59, 999);
        params.set("to", endDate.toISOString());
      }
    } else if (resolvedTf !== "todos") {
      const now = new Date();
      let s = new Date();
      if (resolvedTf === "hoy")    s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (resolvedTf === "semana")  s.setDate(now.getDate() - 7);
      else if (resolvedTf === "mes")     s.setDate(now.getDate() - 30);
      else if (resolvedTf === "6meses")  s.setDate(now.getDate() - 180);
      else if (resolvedTf === "1anno")   s.setDate(now.getDate() - 365);
      params.set("from", s.toISOString());
      params.set("to", now.toISOString());
    }

    const resolvedSeller = seller ?? sellerFilter;
    if (resolvedSeller !== "todos") params.set("vendedorId", resolvedSeller);

    return params.toString();
  }

  // ─── Load ventas ─────────────────────────────────────────────────────
  const loadSales = useCallback(async (
    page: number,
    size: number,
    opts?: { tf?: string; start?: string; end?: string; seller?: string }
  ) => {
    setIsLoading(true);
    try {
      const params = buildParams(page, size, opts?.tf, opts?.start, opts?.end, opts?.seller);
      const response = await fetch(`/api/ventas?${params}`);
      const data = await response.json() as {
        data?: Transaccion[];
        meta?: { page: number; size: number; total: number; totalPages: number };
        totales?: { totalRecaudado: number; totalTransacciones: number };
        message?: string;
      };

      if (!response.ok || !data.data) {
        toast.error(data.message ?? "No se pudo cargar el historial de ventas.");
        return;
      }

      setTransacciones(data.data);
      if (data.meta) {
        setCurrentPage(data.meta.page);
        setTotalPages(data.meta.totalPages);
        setTotalRecords(data.meta.total);
      }
      if (data.totales) setServerTotales(data.totales);
    } catch {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerFilter]);

  // Opciones de filtro rápido
  const filterOptions = [
    { value: "todos", label: "Todo" },
    { value: "hoy", label: "Hoy" },
    { value: "semana", label: "7d" },
    { value: "mes", label: "30d" },
    { value: "6meses", label: "6m" },
    { value: "1anno", label: "1a" },
  ];

  function handleTimeFilter(value: string) {
    setCustomStartDate("");
    setCustomEndDate("");
    setTimeFilter(value);
    setCurrentPage(1);
    void loadSales(1, pageSize, { tf: value, start: "", end: "" });
  }

  function handleApplyDateRange() {
    setTimeFilter("todos");
    setCurrentPage(1);
    void loadSales(1, pageSize, { tf: "todos", start: customStartDate, end: customEndDate });
  }

  function handleClearDates() {
    setCustomStartDate("");
    setCustomEndDate("");
    setCurrentPage(1);
    void loadSales(1, pageSize, { tf: "todos", start: "", end: "" });
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setCurrentPage(1);
    void loadSales(1, size);
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
    void loadSales(page, pageSize);
  }

  // Montar
  useEffect(() => {
    void loadSales(1, pageSize, { tf: "todos" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vendedores únicos
  const sellers = useMemo(() => {
    const set = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const t of transacciones) {
      if (t.vendedor && !set.has(t.vendedor.id)) {
        set.add(t.vendedor.id);
        list.push({ id: t.vendedor.id, name: t.vendedor.nombre });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [transacciones]);

  // Filtrado local (solo búsqueda de producto)
  const filtered = useMemo(() => {
    if (!productSearch.trim()) return transacciones;
    return transacciones.filter((t) =>
      t.ventas.some((v) =>
        v.producto.nombre.toLowerCase().includes(productSearch.trim().toLowerCase())
      )
    );
  }, [transacciones, productSearch]);

  // Estadísticas
  const stats = useMemo(() => {
    if (!productSearch.trim() && serverTotales) {
      const ticket =
        serverTotales.totalTransacciones > 0
          ? serverTotales.totalRecaudado / serverTotales.totalTransacciones
          : 0;
      return {
        totalRecaudado: serverTotales.totalRecaudado,
        totalTransacciones: serverTotales.totalTransacciones,
        ticketPromedio: ticket,
      };
    }
    const totalRecaudado = filtered.reduce((a, t) => a + Number(t.total), 0);
    const total = filtered.length;
    return {
      totalRecaudado,
      totalTransacciones: total,
      ticketPromedio: total > 0 ? totalRecaudado / total : 0,
    };
  }, [filtered, productSearch, serverTotales]);

  // Export URL Excel
  const exportParams = useMemo(() => {
    const now = new Date();
    if (customStartDate || customEndDate) {
      const p = new URLSearchParams();
      if (customStartDate) p.set("startDate", new Date(customStartDate).toISOString());
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        p.set("endDate", end.toISOString());
      }
      return p.toString();
    }
    if (timeFilter !== "todos") {
      let s = new Date();
      if (timeFilter === "hoy") s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (timeFilter === "semana") s.setDate(now.getDate() - 7);
      else if (timeFilter === "mes") s.setDate(now.getDate() - 30);
      else if (timeFilter === "6meses") s.setDate(now.getDate() - 180);
      else if (timeFilter === "1anno") s.setDate(now.getDate() - 365);
      return `startDate=${encodeURIComponent(s.toISOString())}&endDate=${encodeURIComponent(now.toISOString())}`;
    }
    return "";
  }, [timeFilter, customStartDate, customEndDate]);

  const exportUrl = exportParams ? `/api/exportar?${exportParams}` : "/api/exportar";

  const [generatingPDF, setGeneratingPDF] = useState(false);

  async function exportToPDF() {
    setGeneratingPDF(true);
    toast("Preparando PDF con todas las ventas...", { icon: "⏳" });
    try {
      // Fetch ALL records (no pagination) with the current active filters
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("size", "9999"); // fetch all

      if (customStartDate || customEndDate) {
        if (customStartDate) params.set("from", new Date(customStartDate).toISOString());
        if (customEndDate) {
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          params.set("to", endDate.toISOString());
        }
      } else if (timeFilter !== "todos") {
        const now = new Date();
        let s = new Date();
        if (timeFilter === "hoy")        s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        else if (timeFilter === "semana") s.setDate(now.getDate() - 7);
        else if (timeFilter === "mes")   s.setDate(now.getDate() - 30);
        else if (timeFilter === "6meses") s.setDate(now.getDate() - 180);
        else if (timeFilter === "1anno") s.setDate(now.getDate() - 365);
        params.set("from", s.toISOString());
        params.set("to", now.toISOString());
      }

      const res = await fetch(`/api/ventas?${params.toString()}`);
      const json = await res.json() as { data?: Transaccion[]; totales?: { totalRecaudado: number; totalTransacciones: number } };
      const allData: Transaccion[] = json.data ?? [];

      // Apply local product search filter if active
      const toExport = productSearch.trim()
        ? allData.filter((t) =>
            t.ventas.some((v) =>
              v.producto.nombre.toLowerCase().includes(productSearch.trim().toLowerCase())
            )
          )
        : allData;

      const doc = new jsPDF();
      const totalRecaudado    = toExport.reduce((a, t) => a + Number(t.total), 0);
      const totalTransacciones = toExport.length;
      const ticketPromedio    = totalTransacciones > 0 ? totalRecaudado / totalTransacciones : 0;
      const totalEfectivo     = toExport.reduce((a, t) => a + Number(t.pagoEfectivo), 0);
      const totalNequi        = toExport.reduce((a, t) => a + Number(t.pagoNequi), 0);
      const totalBancolombia  = toExport.reduce((a, t) => a + Number(t.pagoBancolombia), 0);
      const totalFiado        = toExport.reduce((a, t) => a + Number(t.pagoFiado), 0);

      // Header banner
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Reporte de Ventas", 14, 18);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Tienda Casera", 14, 26);
      doc.setFontSize(9);
      doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 130, 18);
      const periodText =
        customStartDate && customEndDate
          ? `Período: ${customStartDate} a ${customEndDate}`
          : "Período: Todo el historial";
      doc.text(periodText, 130, 26);
      doc.text(`Total registros: ${totalTransacciones}`, 130, 33);

      doc.setTextColor(30, 41, 59);

      // Card resumen
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 48, 86, 36, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("RESUMEN GENERAL", 20, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Total Recaudado: ${formatCurrency(totalRecaudado)}`, 20, 62);
      doc.text(`Transacciones: ${totalTransacciones}`, 20, 68);
      doc.text(`Ticket Promedio: ${formatCurrency(ticketPromedio)}`, 20, 74);

      // Card métodos de pago
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(110, 48, 86, 36, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("MÉTODOS DE PAGO", 116, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Efectivo: ${formatCurrency(totalEfectivo)}`, 116, 62);
      doc.text(`Nequi: ${formatCurrency(totalNequi)}`, 116, 68);
      doc.text(`Bancolombia: ${formatCurrency(totalBancolombia)}`, 116, 74);
      doc.text(`Fiado: ${formatCurrency(totalFiado)}`, 116, 80);

      // Tabla con TODAS las ventas
      const tableRows = toExport.map((t) => [
        formatDate(t.fecha),
        t.vendedor?.nombre ?? "-",
        t.ventas.map((v) => `${v.producto.nombre} (x${v.cantidad})`).join(", "),
        formatCurrency(t.total),
        [
          Number(t.pagoEfectivo) > 0    ? `Efectivo: ${formatCurrency(t.pagoEfectivo)}` : "",
          Number(t.pagoNequi) > 0       ? `Nequi: ${formatCurrency(t.pagoNequi)}` : "",
          Number(t.pagoBancolombia) > 0 ? `Bancolombia: ${formatCurrency(t.pagoBancolombia)}` : "",
          Number(t.pagoFiado) > 0       ? `Fiado: ${formatCurrency(t.pagoFiado)}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ]);

      autoTable(doc, {
        startY: 92,
        head: [["Fecha", "Vendedor", "Productos", "Total", "Detalle Pago"]],
        body: tableRows,
        styles: { fontSize: 7.5, overflow: "linebreak" },
        headStyles: { fillColor: [30, 58, 95] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`reporte_ventas_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(`PDF con ${totalTransacciones} ventas descargado con éxito`);
    } catch (error) {
      console.error(error);
      toast.error("Error al generar el PDF");
    } finally {
      setGeneratingPDF(false);
    }
  }


  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Render páginas numéricas ─────────────────────────────────────────
  function renderPageNumbers() {
    if (totalPages <= 1) return null;
    const range: number[] = [];
    const delta = 2;
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    for (let i = left; i <= right; i++) range.push(i);
    if (left > 1) { range.unshift(-1); range.unshift(1); }
    if (right < totalPages) { range.push(-2); range.push(totalPages); }

    return range.map((p, idx) =>
      p < 0 ? (
        <span key={`dots-${idx}`} className="px-1 text-slate-400 text-sm">…</span>
      ) : (
        <button
          key={p}
          onClick={() => handlePageChange(p)}
          className={`h-8 w-8 rounded-lg text-sm font-bold transition ${
            currentPage === p
              ? "bg-primary-600 text-white shadow"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {p}
        </button>
      )
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6 mb-8">
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-primary-700">Administrador</p>
          <h1 className="mt-1 text-4xl font-black text-slate-900">Historial de Ventas</h1>
          <p className="mt-1.5 text-base text-slate-600">
            Revisa, filtra y exporta todas las transacciones de la tienda.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={exportUrl}
            download
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
          >
            <Download size={18} />
            Excel
          </a>
          <button
            onClick={() => void exportToPDF()}
            type="button"
            disabled={generatingPDF}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-rose-100 hover:bg-rose-700 disabled:opacity-60 transition cursor-pointer"
          >
            <FileText size={18} />
            {generatingPDF ? "Generando..." : "PDF"}
          </button>
        </div>
      </header>

      {/* Métricas */}
      <section className="grid gap-4 sm:grid-cols-3 mb-8">
        {[
          { label: "Total Recaudado", value: formatCurrency(stats.totalRecaudado) },
          { label: "Transacciones", value: `${stats.totalTransacciones}` },
          { label: "Ticket Promedio", value: formatCurrency(stats.ticketPromedio) },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wider text-slate-500">{m.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{m.value}</p>
          </div>
        ))}
      </section>

      {/* Filtros */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Búsqueda */}
        <div>
          <label className="block text-sm font-black text-slate-700 mb-1.5">Buscar Producto</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ej. Cerveza, Huevo..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Vendedor */}
        <div>
          <label className="block text-sm font-black text-slate-700 mb-1.5">Vendedor</label>
          <select
            value={sellerFilter}
            onChange={(e) => {
              const value = e.target.value;
              setSellerFilter(value);
              setCurrentPage(1);
              void loadSales(1, pageSize, { seller: value });
            }}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="todos">Todos</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Período rápido */}
        <div>
          <label className="block text-sm font-black text-slate-700 mb-1.5">Período Rápido</label>
          <div className="flex gap-1.5 flex-wrap">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleTimeFilter(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition border ${
                  timeFilter === opt.value && !customStartDate && !customEndDate
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha personalizada */}
        <div>
          <label className="block text-sm font-black text-slate-700 mb-1.5">Rango de Fechas</label>
          <div className="flex flex-col gap-1.5">
            <input
              id="admin-start-date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              aria-label="Fecha inicio"
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              id="admin-end-date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              aria-label="Fecha fin"
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleApplyDateRange}
              className="w-full py-2 rounded-xl text-xs font-black bg-primary-600 text-white hover:bg-primary-700 transition"
            >
              Buscar por fecha
            </button>
            {(customStartDate || customEndDate) && (
              <button
                onClick={handleClearDates}
                className="w-full py-1.5 rounded-xl text-xs font-black border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
              >
                Limpiar fechas
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Indicador de filtro activo */}
      {(customStartDate || customEndDate) && !isLoading && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary-50 border border-primary-200 text-primary-800 text-sm font-black mb-4">
          <span>🔍</span>
          <span>
            {customStartDate && <>Desde <strong>{customStartDate}</strong> </>}
            {customEndDate && <>hasta <strong>{customEndDate}</strong></>}
            {" · "}<strong>{totalRecords}</strong> ventas encontradas
          </span>
        </div>
      )}

      {/* ── Lista de ventas + Paginación ────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Barra superior: info + selector de filas */}
        {!isLoading && totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm text-slate-600 font-semibold">
              Mostrando <strong>{transacciones.length}</strong> de <strong>{totalRecords}</strong> ventas
              {totalPages > 1 && <> · Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong></>}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500">Por página:</label>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
            <p className="mt-4 font-bold text-slate-500">Cargando ventas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <ShoppingBag size={48} className="mb-3 text-slate-300" />
            <p className="font-black text-lg">No se encontraron transacciones</p>
            <p className="text-sm mt-1">Prueba cambiando los filtros.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((t) => {
              const isOpen = expanded.has(t.id);
              const numItems = t.ventas.reduce((a, v) => a + v.cantidad, 0);
              return (
                <div key={t.id}>
                  <button
                    onClick={() => toggleExpand(t.id)}
                    type="button"
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition text-left group"
                  >
                    <span className="shrink-0 text-slate-400 group-hover:text-primary-600 transition">
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-black text-slate-900">{formatDate(t.fecha)}</span>
                        <span className="text-xs font-bold text-slate-400">{numItems} producto(s)</span>
                        <span className="text-xs font-bold text-slate-400">· {t.vendedor?.nombre ?? "-"}</span>
                      </div>
                      <div className="mt-1.5">
                        <PaymentBadges t={t} />
                      </div>
                    </div>
                    <span className="shrink-0 text-base font-black text-slate-900">
                      {formatCurrency(t.total)}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 space-y-2">
                      {t.ventas.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.producto.nombre}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                              {item.producto.categoria.nombre} · {item.cantidad} × {formatCurrency(item.precioUnitario)}
                            </p>
                          </div>
                          <span className="text-sm font-black text-primary-700">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      ))}
                      {t.fiado && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                          <p className="text-xs font-black text-amber-800">
                            📒 Fiado — {t.fiado.cliente.nombre} — {formatCurrency(t.fiado.montoTotal)} —{" "}
                            <span
                              className={
                                t.fiado.estado === "PAGADO_TOTAL" ? "text-green-700" : "text-red-700"
                              }
                            >
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

        {/* ── Controles de paginación ──────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
              {" · "}<strong>{totalRecords}</strong> ventas en total
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>

              <div className="flex items-center gap-1">
                {renderPageNumbers()}
              </div>

              <button
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
