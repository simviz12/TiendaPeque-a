"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Minus,
  Plus,
  ShoppingCart,
  Tag,
  Layers,
  ShoppingBag,
  X,
  Trash2,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Receipt,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────
type Categoria = { id: string; nombre: string; tipo: "normal" | "sensible" };
type Producto = {
  id: string;
  nombre: string;
  categoriaId: string;
  categoria: Categoria;
  precio: string;
  stock: number;
};
type Cliente = { id: string; nombre: string; telefono: string | null };
type ItemCarrito = { producto: Producto; cantidad: number };

type MetodoPago = "EFECTIVO" | "NEQUI" | "BANCOLOMBIA" | "FIADO" | "MIXTO";

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Componente Principal ─────────────────────────────────────────────────
export function SellClient() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carrito
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // Modal de cobro
  const [showModal, setShowModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");

  // Pagos mixtos
  const [mixtoEfectivo, setMixtoEfectivo] = useState("");
  const [mixtoNequi, setMixtoNequi] = useState("");
  const [mixtoBancolombia, setMixtoBancolombia] = useState("");
  const [mixtoFiado, setMixtoFiado] = useState("");

  // Fiado — clientes
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [notas, setNotas] = useState("");

  // ─── Carga de datos ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resProd, resCli] = await Promise.all([
        fetch("/api/productos"),
        fetch("/api/clientes"),
      ]);
      const dataProd = await resProd.json();
      const dataCli = await resCli.json();
      if (dataProd.productos || dataProd.data)
        setProductos(dataProd.productos ?? dataProd.data);
      if (dataCli.success) setClientes(dataCli.data);
    } catch {
      toast.error("Error al cargar datos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // ─── Categorías y productos filtrados ────────────────────────────────
  const categorias = useMemo(() => {
    const map = new Map<string, Categoria>();
    for (const p of productos) map.set(p.categoria.id, p.categoria);
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

  useEffect(() => {
    if (!selectedCategoryId && categorias.length > 0)
      setSelectedCategoryId(categorias[0].id);
  }, [categorias, selectedCategoryId]);

  const filteredProducts = useMemo(
    () => productos.filter((p) => p.categoriaId === selectedCategoryId),
    [productos, selectedCategoryId],
  );

  // ─── Totales del carrito ──────────────────────────────────────────────
  const totalCarrito = useMemo(
    () => carrito.reduce((acc, item) => acc + Number(item.producto.precio) * item.cantidad, 0),
    [carrito],
  );
  const totalItems = useMemo(
    () => carrito.reduce((acc, item) => acc + item.cantidad, 0),
    [carrito],
  );

  // ─── Acciones del carrito ─────────────────────────────────────────────
  function agregarAlCarrito(producto: Producto) {
    setCarrito((prev) => {
      const existing = prev.find((i) => i.producto.id === producto.id);
      if (existing) {
        if (existing.cantidad >= producto.stock) {
          toast.error(`Solo quedan ${producto.stock} unidades de "${producto.nombre}".`);
          return prev;
        }
        return prev.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i,
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  }

  function cambiarCantidad(productoId: string, delta: number) {
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (i.producto.id !== productoId) return i;
          const nueva = i.cantidad + delta;
          if (nueva <= 0) return null;
          if (nueva > i.producto.stock) {
            toast.error(`Solo quedan ${i.producto.stock} unidades.`);
            return i;
          }
          return { ...i, cantidad: nueva };
        })
        .filter(Boolean) as ItemCarrito[],
    );
  }

  function eliminarDelCarrito(productoId: string) {
    setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId));
  }

  function limpiarCarrito() {
    setCarrito([]);
    cerrarModal();
  }

  // ─── Modal de cobro ───────────────────────────────────────────────────
  function abrirModal() {
    if (carrito.length === 0) return;
    setMetodoPago("EFECTIVO");
    setMixtoEfectivo("");
    setMixtoNequi("");
    setMixtoBancolombia("");
    setMixtoFiado("");
    setSelectedClienteId("");
    setClienteNombre("");
    setClienteTelefono("");
    setNotas("");
    setShowModal(true);
  }

  function cerrarModal() {
    setShowModal(false);
  }

  // ─── Validación de pagos mixtos ───────────────────────────────────────
  const sumaMixto = useMemo(() => {
    return (
      (parseFloat(mixtoEfectivo) || 0) +
      (parseFloat(mixtoNequi) || 0) +
      (parseFloat(mixtoBancolombia) || 0) +
      (parseFloat(mixtoFiado) || 0)
    );
  }, [mixtoEfectivo, mixtoNequi, mixtoBancolombia, mixtoFiado]);

  const mixtoValido = useMemo(() => {
    if (metodoPago !== "MIXTO") return true;
    return Math.abs(sumaMixto - totalCarrito) < 1;
  }, [metodoPago, sumaMixto, totalCarrito]);

  const necesitaCliente = useMemo(() => {
    if (metodoPago === "FIADO") return true;
    if (metodoPago === "MIXTO" && (parseFloat(mixtoFiado) || 0) > 0) return true;
    return false;
  }, [metodoPago, mixtoFiado]);

  // ─── Construir payload de pagos ────────────────────────────────────────
  function buildPagos() {
    switch (metodoPago) {
      case "EFECTIVO":    return { pagoEfectivo: totalCarrito, pagoNequi: 0, pagoBancolombia: 0, pagoFiado: 0 };
      case "NEQUI":       return { pagoEfectivo: 0, pagoNequi: totalCarrito, pagoBancolombia: 0, pagoFiado: 0 };
      case "BANCOLOMBIA": return { pagoEfectivo: 0, pagoNequi: 0, pagoBancolombia: totalCarrito, pagoFiado: 0 };
      case "FIADO":       return { pagoEfectivo: 0, pagoNequi: 0, pagoBancolombia: 0, pagoFiado: totalCarrito };
      case "MIXTO":       return {
        pagoEfectivo:    parseFloat(mixtoEfectivo) || 0,
        pagoNequi:       parseFloat(mixtoNequi) || 0,
        pagoBancolombia: parseFloat(mixtoBancolombia) || 0,
        pagoFiado:       parseFloat(mixtoFiado) || 0,
      };
    }
  }

  // ─── Confirmar venta ──────────────────────────────────────────────────
  async function handleConfirmarVenta() {
    if (carrito.length === 0) return;

    if (necesitaCliente && !selectedClienteId && !clienteNombre.trim()) {
      toast.error("Debe seleccionar o crear un cliente para el fiado.");
      return;
    }

    if (!mixtoValido) {
      toast.error("La suma de pagos no coincide con el total del carrito.");
      return;
    }

    const pagos = buildPagos();

    setIsSaving(true);
    try {
      const response = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: carrito.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
          ...pagos,
          clienteId:      necesitaCliente ? selectedClienteId || undefined : undefined,
          clienteNombre:  necesitaCliente && !selectedClienteId ? clienteNombre : undefined,
          clienteTelefono: necesitaCliente && !selectedClienteId ? clienteTelefono : undefined,
          notas,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "No se pudo registrar la venta.");
        return;
      }

      toast.success(`¡Venta registrada! ${totalItems} producto(s) — ${formatCurrency(totalCarrito)}`);
      limpiarCarrito();
      await loadData();
    } catch {
      toast.error("Error de conexión al guardar la venta.");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Cantidad en carrito de un producto ──────────────────────────────
  function cantidadEnCarrito(productoId: string) {
    return carrito.find((i) => i.producto.id === productoId)?.cantidad ?? 0;
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow">
            <ShoppingBag size={20} />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-primary-700">
              🟢 Caja Abierta
            </span>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              Punto de Venta
            </h1>
          </div>
        </div>
        {totalItems > 0 && (
          <div className="flex items-center gap-2 text-sm font-black text-slate-600">
            <ShoppingCart size={18} className="text-primary-600" />
            <span>{totalItems} ítem(s) — {formatCurrency(totalCarrito)}</span>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
          <p className="mt-4 text-lg font-black text-slate-600">Cargando catálogo...</p>
        </div>
      ) : (
        /* ── Split Screen ──────────────────────────────────────────────── */
        <div className="flex h-[calc(100vh-65px)]">

          {/* ── LEFT: Catálogo (70%) ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Categorías */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={18} className="text-primary-700" />
                <h2 className="text-base font-black text-slate-900">Categoría</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {categorias.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      type="button"
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition-all active:scale-95 ${
                        isSelected
                          ? "bg-primary-600 text-white shadow-md shadow-primary-200"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {cat.nombre}
                      {isSelected && <CheckCircle2 size={13} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Productos */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={18} className="text-primary-700" />
                <h2 className="text-base font-black text-slate-900">
                  Productos — toca para agregar al carrito
                </h2>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                  <p className="font-black">No hay productos en esta categoría.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredProducts.map((producto) => {
                    const isAgotado = producto.stock <= 0;
                    const enCarrito = cantidadEnCarrito(producto.id);
                    const isLowStock = producto.stock > 0 && producto.stock <= 5;

                    return (
                      <div
                        key={producto.id}
                        className={`relative flex flex-col rounded-2xl border p-4 transition-all duration-150 ${
                          isAgotado
                            ? "border-slate-200 bg-slate-100 opacity-50"
                            : enCarrito > 0
                            ? "border-primary-400 bg-primary-50 shadow-md shadow-primary-100"
                            : "border-slate-300 bg-white hover:border-primary-400 hover:shadow-sm"
                        }`}
                      >
                        {/* Badge stock */}
                        <span
                          className={`absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[10px] font-black ${
                            isAgotado
                              ? "bg-red-100 text-red-700"
                              : isLowStock
                              ? "bg-amber-100 text-amber-800 animate-pulse border border-amber-300"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isAgotado ? "Agotado" : `${producto.stock}`}
                        </span>

                        {/* Badge carrito */}
                        {enCarrito > 0 && (
                          <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-[11px] font-black text-white shadow">
                            {enCarrito}
                          </span>
                        )}

                        <p className="mt-2 pr-10 text-sm font-black text-slate-900 leading-tight line-clamp-2">
                          {producto.nombre}
                        </p>
                        <p className="mt-2 text-lg font-extrabold text-primary-700">
                          {formatCurrency(Number(producto.precio))}
                        </p>

                        {/* Controles */}
                        {!isAgotado && (
                          <div className="mt-3 flex items-center gap-1.5">
                            {enCarrito > 0 ? (
                              <>
                                <button
                                  onClick={() => cambiarCantidad(producto.id, -1)}
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition active:scale-90"
                                >
                                  <Minus size={14} strokeWidth={3} />
                                </button>
                                <span className="flex-1 text-center text-sm font-black text-slate-900">
                                  {enCarrito}
                                </span>
                                <button
                                  onClick={() => cambiarCantidad(producto.id, 1)}
                                  disabled={enCarrito >= producto.stock}
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition active:scale-90 disabled:opacity-30"
                                >
                                  <Plus size={14} strokeWidth={3} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => agregarAlCarrito(producto)}
                                type="button"
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2 text-xs font-black text-white shadow hover:bg-primary-700 transition active:scale-95"
                              >
                                <PlusCircle size={14} />
                                Agregar
                              </button>
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

          {/* ── RIGHT: Ticket / Carrito (30%) ─────────────────────────── */}
          <div className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col shadow-xl">
            {/* Encabezado carrito */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-primary-600" />
                <span className="font-black text-slate-900">Ticket de Compra</span>
              </div>
              {carrito.length > 0 && (
                <button
                  onClick={limpiarCarrito}
                  type="button"
                  className="text-xs font-bold text-slate-400 hover:text-red-500 transition flex items-center gap-1"
                >
                  <Trash2 size={13} /> Vaciar
                </button>
              )}
            </div>

            {/* Ítems del carrito */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-12">
                  <ShoppingCart size={40} className="mb-3 opacity-30" />
                  <p className="text-sm font-bold">El carrito está vacío</p>
                  <p className="text-xs mt-1">Toca un producto para agregarlo</p>
                </div>
              ) : (
                carrito.map((item) => (
                  <div
                    key={item.producto.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 leading-tight truncate">
                        {item.producto.nombre}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {formatCurrency(Number(item.producto.precio))} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => cambiarCantidad(item.producto.id, -1)}
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition active:scale-90"
                      >
                        <Minus size={11} strokeWidth={3} />
                      </button>
                      <span className="w-5 text-center text-xs font-black text-slate-900">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(item.producto.id, 1)}
                        disabled={item.cantidad >= item.producto.stock}
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition active:scale-90 disabled:opacity-30"
                      >
                        <Plus size={11} strokeWidth={3} />
                      </button>
                    </div>
                    <div className="text-right shrink-0 ml-1">
                      <p className="text-xs font-black text-primary-700">
                        {formatCurrency(Number(item.producto.precio) * item.cantidad)}
                      </p>
                      <button
                        onClick={() => eliminarDelCarrito(item.producto.id)}
                        type="button"
                        className="mt-0.5 text-[10px] text-slate-300 hover:text-red-500 transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total + Botón Cobrar */}
            <div className="border-t border-slate-200 px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-500">TOTAL</span>
                <span className="text-2xl font-black text-slate-900">
                  {formatCurrency(totalCarrito)}
                </span>
              </div>
              <button
                onClick={abrirModal}
                disabled={carrito.length === 0}
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 py-4 text-base font-black text-white shadow-lg shadow-primary-200 transition hover:bg-primary-700 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CreditCard size={20} />
                Cobrar {carrito.length > 0 ? formatCurrency(totalCarrito) : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL DE COBRO
      ═══════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={cerrarModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">💳 Cobrar al Cliente</h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  {totalItems} producto(s) en el carrito
                </p>
              </div>
              <button
                onClick={cerrarModal}
                className="p-2 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 transition"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">

              {/* Resumen del carrito */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Resumen del Pedido
                </p>
                {carrito.map((item) => (
                  <div key={item.producto.id} className="flex justify-between text-sm">
                    <span className="text-slate-700 font-bold">
                      {item.cantidad}× {item.producto.nombre}
                    </span>
                    <span className="font-black text-slate-900">
                      {formatCurrency(Number(item.producto.precio) * item.cantidad)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 mt-1 border-t border-slate-200 flex justify-between">
                  <span className="font-black text-slate-900">TOTAL</span>
                  <span className="text-xl font-black text-primary-700">
                    {formatCurrency(totalCarrito)}
                  </span>
                </div>
              </div>

              {/* Selector de método de pago */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Método de Pago
                </p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {(["EFECTIVO", "NEQUI", "BANCOLOMBIA"] as MetodoPago[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetodoPago(m)}
                      type="button"
                      className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 text-xs font-black transition active:scale-95 border-2 ${
                        metodoPago === m
                          ? m === "NEQUI"
                            ? "border-purple-600 bg-purple-600 text-white"
                            : m === "BANCOLOMBIA"
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-primary-600 bg-primary-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {m === "EFECTIVO" && "💵"}
                      {m === "NEQUI" && "📱"}
                      {m === "BANCOLOMBIA" && "🏦"}
                      <span className="mt-1">{m === "EFECTIVO" ? "Efectivo" : m === "NEQUI" ? "Nequi" : "Bancolombia"}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["FIADO", "MIXTO"] as MetodoPago[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetodoPago(m)}
                      type="button"
                      className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition active:scale-95 border-2 ${
                        metodoPago === m
                          ? m === "FIADO"
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-violet-600 bg-violet-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {m === "FIADO" ? "📒 Fiar" : "🔀 Mixto"}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── PAGO MIXTO ─────────────────────────────────────── */}
              {metodoPago === "MIXTO" && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-violet-800 mb-1">
                    🔀 Distribuir el pago — Total: {formatCurrency(totalCarrito)}
                  </p>
                  {[
                    { label: "💵 Efectivo", key: "efectivo", val: mixtoEfectivo, setter: setMixtoEfectivo },
                    { label: "📱 Nequi", key: "nequi", val: mixtoNequi, setter: setMixtoNequi },
                    { label: "🏦 Bancolombia", key: "bancolombia", val: mixtoBancolombia, setter: setMixtoBancolombia },
                    { label: "📒 Fiado", key: "fiado", val: mixtoFiado, setter: setMixtoFiado },
                  ].map(({ label, key, val, setter }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-black text-violet-700 uppercase tracking-wider mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={val}
                        onChange={(e) => setter(e.target.value)}
                        placeholder="$ 0"
                        className="w-full rounded-xl border border-violet-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  ))}
                  {/* Indicador de suma */}
                  <div className={`flex items-center justify-between rounded-xl p-3 text-sm font-black ${
                    mixtoValido ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    <span>Suma actual:</span>
                    <span>{formatCurrency(sumaMixto)}</span>
                  </div>
                  {!mixtoValido && (
                    <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                      <AlertTriangle size={14} />
                      Faltan {formatCurrency(Math.abs(totalCarrito - sumaMixto))} por asignar
                    </div>
                  )}
                </div>
              )}

              {/* ─── SECCIÓN FIADO / CLIENTE ──────────────────────── */}
              {necesitaCliente && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-900 mb-1">
                    📒 Datos del Cliente (Fiado)
                  </p>
                  <select
                    value={selectedClienteId}
                    onChange={(e) => {
                      setSelectedClienteId(e.target.value);
                      if (e.target.value) { setClienteNombre(""); setClienteTelefono(""); }
                    }}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">— Crear Nuevo Cliente —</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>

                  {!selectedClienteId && (
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        placeholder="Nombre del cliente *"
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                        placeholder="Teléfono (opcional)"
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Notas (opcional)"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Total a cobrar — banner de color */}
              <div className={`rounded-2xl p-5 text-white shadow-lg ${
                metodoPago === "FIADO" ? "bg-gradient-to-br from-amber-500 to-orange-700" :
                metodoPago === "NEQUI" ? "bg-gradient-to-br from-purple-600 to-purple-900" :
                metodoPago === "BANCOLOMBIA" ? "bg-gradient-to-br from-blue-600 to-blue-900" :
                metodoPago === "MIXTO" ? "bg-gradient-to-br from-violet-600 to-violet-900" :
                "bg-gradient-to-br from-primary-600 to-teal-800"
              }`}>
                <p className="text-xs font-black uppercase tracking-widest opacity-80">
                  Total a {metodoPago === "FIADO" ? "fiar" : "cobrar"}
                </p>
                <p className="text-4xl font-black mt-1">{formatCurrency(totalCarrito)}</p>
              </div>

              {/* Botones de acción */}
              <div className="space-y-2 pb-2">
                <button
                  disabled={isSaving || !mixtoValido}
                  onClick={handleConfirmarVenta}
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 hover:bg-slate-800 py-4 text-lg font-black text-white shadow-lg transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={22} strokeWidth={2.5} />
                      Confirmar Venta
                    </>
                  )}
                </button>
                <button
                  onClick={cerrarModal}
                  type="button"
                  className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
