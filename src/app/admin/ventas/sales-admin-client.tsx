"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search, Download, ShoppingBag, ChevronDown, ChevronRight } from "lucide-react";

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
  vendedor: { nombre: string; usuario: string };
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

  // Filters
  const [productSearch, setProductSearch] = useState("");
  const [sellerFilter, setSellerFilter] = useState("todos");
  const [timeFilter, setTimeFilter] = useState("todos");

  async function loadSales() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ventas");
      const data = await response.json();
      const list = data.data;
      if (!response.ok || !list) {
        toast.error(data.message ?? "No se pudo cargar el historial de ventas.");
        return;
      }
      setTransacciones(list);
    } catch {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadSales(); }, []);

  // Vendedores únicos de las transacciones
  const sellers = useMemo(() => {
    const set = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const t of transacciones) {
      if (t.vendedor && !set.has(t.vendedor.usuario)) {
        set.add(t.vendedor.usuario);
        list.push({ id: t.vendedor.usuario, name: t.vendedor.nombre });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [transacciones]);

  // Filtrado
  const filtered = useMemo(() => {
    return transacciones.filter((t) => {
      // Búsqueda por producto (dentro de los ítems)
      const matchesProduct =
        !productSearch.trim() ||
        t.ventas.some((v) =>
          v.producto.nombre.toLowerCase().includes(productSearch.trim().toLowerCase()),
        );

      // Vendedor
      const matchesSeller =
        sellerFilter === "todos" || t.vendedor?.usuario === sellerFilter;

      // Tiempo
      let matchesTime = true;
      const d = new Date(t.fecha);
      const now = new Date();
      if (timeFilter === "hoy") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchesTime = d >= start;
      } else if (timeFilter === "semana") {
        const w = new Date(); w.setDate(now.getDate() - 7);
        matchesTime = d >= w;
      } else if (timeFilter === "mes") {
        const m = new Date(); m.setDate(now.getDate() - 30);
        matchesTime = d >= m;
      }

      return matchesProduct && matchesSeller && matchesTime;
    });
  }, [transacciones, productSearch, sellerFilter, timeFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalRecaudado = filtered.reduce((a, t) => a + Number(t.total), 0);
    const total = filtered.length;
    return {
      totalRecaudado,
      totalTransacciones: total,
      ticketPromedio: total > 0 ? totalRecaudado / total : 0,
    };
  }, [filtered]);

  // URL de exportación
  const exportUrl = useMemo(() => {
    const base = "/api/exportar";
    const now = new Date();
    if (timeFilter === "hoy") {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return `${base}?startDate=${encodeURIComponent(s.toISOString())}&endDate=${encodeURIComponent(now.toISOString())}`;
    }
    if (timeFilter === "semana") {
      const s = new Date(); s.setDate(now.getDate() - 7);
      return `${base}?startDate=${encodeURIComponent(s.toISOString())}&endDate=${encodeURIComponent(now.toISOString())}`;
    }
    if (timeFilter === "mes") {
      const s = new Date(); s.setDate(now.getDate() - 30);
      return `${base}?startDate=${encodeURIComponent(s.toISOString())}&endDate=${encodeURIComponent(now.toISOString())}`;
    }
    return base;
  }, [timeFilter]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
        <a
          href={exportUrl}
          download="ventas.xlsx"
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-primary-200 hover:bg-primary-700 transition"
        >
          <Download size={20} />
          Exportar Excel
        </a>
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
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-6 grid gap-4 sm:grid-cols-3">
        {/* Búsqueda por producto */}
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
            onChange={(e) => setSellerFilter(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="todos">Todos</option>
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-sm font-black text-slate-700 mb-1.5">Período</label>
          <div className="flex gap-1.5">
            {["todos", "hoy", "semana", "mes"].map((opt) => (
              <button
                key={opt}
                onClick={() => setTimeFilter(opt)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition border ${
                  timeFilter === opt
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt === "todos" ? "Todo" : opt === "semana" ? "7d" : opt === "mes" ? "30d" : "Hoy"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tabla de transacciones */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                      <div className="mt-1.5"><PaymentBadges t={t} /></div>
                    </div>
                    <span className="shrink-0 text-base font-black text-slate-900">{formatCurrency(t.total)}</span>
                  </button>

                  {isOpen && (
                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 space-y-2">
                      {t.ventas.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-4 py-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.producto.nombre}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                              {item.producto.categoria.nombre} · {item.cantidad} × {formatCurrency(item.precioUnitario)}
                            </p>
                          </div>
                          <span className="text-sm font-black text-primary-700">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      {t.fiado && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                          <p className="text-xs font-black text-amber-800">
                            📒 Fiado — {t.fiado.cliente.nombre} — {formatCurrency(t.fiado.montoTotal)} —{" "}
                            <span className={t.fiado.estado === "PAGADO_TOTAL" ? "text-green-700" : "text-red-700"}>
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
