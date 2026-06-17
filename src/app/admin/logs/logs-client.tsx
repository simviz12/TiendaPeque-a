"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight, User } from "lucide-react";
import toast from "react-hot-toast";

type Log = {
  id: string;
  accion: string;
  fecha: string;
  usuario: { id: string; nombre: string; usuario: string; rol: string };
};

const ROL_BADGE: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  VENDEDOR: "bg-blue-100 text-blue-800",
};

export function LogsClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busquedaUsuario, setBusquedaUsuario] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  const LIMITE = 25;
  const totalPaginas = Math.ceil(total / LIMITE);

  // Guardar referencia a los filtros para usarlos dentro de fetchLogs
  const filtrosRef = useRef({ busquedaUsuario: "", desde: "", hasta: "", filtrosAplicados: false });

  async function fetchLogs(paginaActual: number, applyFilters: boolean) {
    setLoading(true);
    try {
      const f = filtrosRef.current;
      const params = new URLSearchParams({
        pagina: String(paginaActual),
        limite: String(LIMITE),
      });
      if (applyFilters && f.busquedaUsuario) params.set("usuarioId", f.busquedaUsuario);
      if (applyFilters && f.desde) params.set("desde", f.desde);
      if (applyFilters && f.hasta) params.set("hasta", f.hasta);

      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error("Error al cargar los logs.");
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      toast.error("No se pudieron cargar los logs de auditoría.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchLogs(1, false);
  // Solo al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAplicarFiltros() {
    filtrosRef.current = { busquedaUsuario, desde, hasta, filtrosAplicados: true };
    setFiltrosAplicados(true);
    setPagina(1);
    fetchLogs(1, true);
  }

  function handleLimpiarFiltros() {
    filtrosRef.current = { busquedaUsuario: "", desde: "", hasta: "", filtrosAplicados: false };
    setBusquedaUsuario("");
    setDesde("");
    setHasta("");
    setFiltrosAplicados(false);
    setPagina(1);
    fetchLogs(1, false);
  }

  function handleCambiarPagina(nueva: number) {
    setPagina(nueva);
    fetchLogs(nueva, filtrosAplicados);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Encabezado */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-white shadow-lg">
              <ScrollText size={24} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Auditoría del sistema
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Logs de Auditoría
              </h1>
            </div>
          </div>
        </header>

        {/* Panel de filtros */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-700">
            <Filter size={16} />
            Filtros
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="filtro-desde">
                Desde
              </label>
              <input
                id="filtro-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="filtro-hasta">
                Hasta
              </label>
              <input
                id="filtro-hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleAplicarFiltros}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <Search size={16} />
                Filtrar
              </button>
              {filtrosAplicados && (
                <button
                  onClick={handleLimpiarFiltros}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Tabla de logs */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <p className="text-sm font-semibold text-slate-600">
              {loading ? "Cargando..." : `${total} registros encontrados`}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>Página {pagina} de {totalPaginas || 1}</span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-0 divide-y divide-slate-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-4 px-6 py-4">
                  <div className="h-9 w-9 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-slate-200" />
                    <div className="h-2.5 w-1/3 rounded bg-slate-100" />
                  </div>
                  <div className="h-3 w-24 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ScrollText size={32} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-700">No hay registros</h3>
              <p className="mt-1 text-sm text-slate-500">
                No se encontraron logs de auditoría con los filtros actuales.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-2 px-6 py-4 transition hover:bg-slate-50/60 sm:flex-row sm:items-start sm:gap-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{log.usuario.nombre}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${ROL_BADGE[log.usuario.rol] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {log.usuario.rol}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">{log.accion}</p>
                  </div>
                  <time className="shrink-0 text-xs font-semibold text-slate-400">
                    {new Date(log.fecha).toLocaleString("es-CO")}
                  </time>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {!loading && totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <button
                disabled={pagina <= 1}
                onClick={() => handleCambiarPagina(pagina - 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <span className="text-xs font-semibold text-slate-500">
                {pagina} / {totalPaginas}
              </span>
              <button
                disabled={pagina >= totalPaginas}
                onClick={() => handleCambiarPagina(pagina + 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
