"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  Minus, 
  Plus, 
  ShoppingCart, 
  Tag, 
  Layers, 
  CheckCircle2, 
  ShoppingBag,
  X,
  PlusCircle,
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

type Categoria = {
  id: string;
  nombre: string;
  tipo: "normal" | "sensible";
};

type Producto = {
  id: string;
  nombre: string;
  categoriaId: string;
  categoria: Categoria;
  precio: string;
  stock: number;
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function SellClient() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [activeProduct, setActiveProduct] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadProducts() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/productos");
      const data = (await response.json()) as {
        productos?: Producto[];
        data?: Producto[];
        message?: string;
      };

      const productList = data.productos || data.data;

      if (!response.ok || !productList) {
        toast.error(data.message ?? "No se pudieron cargar los productos.");
        return;
      }

      setProductos(productList);
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const categorias = useMemo(() => {
    const map = new Map<string, Categoria>();
    for (const producto of productos) {
      map.set(producto.categoria.id, producto.categoria);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }, [productos]);

  // Autoseleccionar la primera categoría al cargar
  useEffect(() => {
    if (!selectedCategoryId && categorias.length > 0) {
      setSelectedCategoryId(categorias[0].id);
    }
  }, [categorias, selectedCategoryId]);

  const filteredProducts = useMemo(() => {
    return productos.filter(
      (producto) => producto.categoriaId === selectedCategoryId,
    );
  }, [productos, selectedCategoryId]);

  const total = activeProduct ? Number(activeProduct.precio) * cantidad : 0;

  function selectCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
  }

  function openSellModal(producto: Producto) {
    setActiveProduct(producto);
    setCantidad(1);
  }

  function closeSellModal() {
    setActiveProduct(null);
    setCantidad(1);
  }

  async function handleConfirmarVenta() {
    if (!activeProduct) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/ventas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productoId: activeProduct.id,
          cantidad,
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(data.message ?? "No se pudo registrar la venta.");
        return;
      }

      toast.success(`¡Vendido con éxito!`);
      closeSellModal();
      await loadProducts();
    } catch {
      toast.error("Error de conexión al guardar la venta.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Encabezado con letras grandes y claras */}
        <header className="mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs sm:text-sm font-black text-emerald-800">
              🟢 Caja Abierta
            </span>
            <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              ¿Qué desea llevar el cliente?
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-semibold">
              Toca una categoría y luego toca el producto para vender al instante.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 border border-slate-200 text-sm font-bold text-slate-700 w-fit shrink-0">
            <ShoppingBag size={18} className="text-emerald-700" />
            <span>Punto de Venta Casero</span>
          </div>
        </header>

        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
            <p className="mt-4 text-lg font-black text-slate-600">
              Cargando catálogo...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. Categorías - Botones gigantes y fáciles de presionar */}
            <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={20} className="text-emerald-700" />
                <h2 className="text-lg sm:text-xl font-black text-slate-950">1. Seleccione Categoría</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {categorias.map((categoria) => {
                  const isSelected = selectedCategoryId === categoria.id;
                  return (
                    <button
                      key={categoria.id}
                      onClick={() => selectCategory(categoria.id)}
                      type="button"
                      className={`relative flex min-h-[64px] items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-150 active:scale-[0.97] ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-200"
                          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400"
                      }`}
                    >
                      <span className="text-sm sm:text-base font-black tracking-tight leading-tight break-words whitespace-normal pr-1">
                        {categoria.nombre}
                      </span>
                      {isSelected && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600">
                          <CheckCircle2 size={14} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Productos - Tarjetas amplias con precios grandes */}
            <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={20} className="text-emerald-700" />
                <h2 className="text-lg sm:text-xl font-black text-slate-950">2. Toque un Producto para Vender</h2>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
                  <p className="font-black text-lg">No hay productos aquí.</p>
                  <p className="text-sm mt-1">Selecciona otra categoría en los botones de arriba.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((producto) => {
                    const isAgotado = producto.stock <= 0;
                    const isLowStock = producto.stock > 0 && producto.stock <= 5;

                    return (
                      <button
                        key={producto.id}
                        disabled={isAgotado}
                        onClick={() => openSellModal(producto)}
                        type="button"
                        className={`group relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all duration-200 shadow-sm ${
                          isAgotado
                            ? "border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed"
                            : "border-slate-300 bg-white hover:border-emerald-600 hover:shadow-md hover:bg-emerald-50/10 active:scale-[0.98]"
                        }`}
                      >
                        {/* Estado del stock muy visible */}
                        <div className="absolute top-4 right-4">
                          {isAgotado ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                              Agotado
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 animate-pulse border border-amber-300">
                              ¡Quedan {producto.stock}!
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              Stock: {producto.stock}
                            </span>
                          )}
                        </div>

                        {/* Nombre grande del producto */}
                        <div className="pr-16 mt-2">
                          <span className="block text-lg sm:text-xl font-black text-slate-900 leading-tight group-hover:text-emerald-950 transition-colors">
                            {producto.nombre}
                          </span>
                        </div>

                        {/* Precio muy visible en verde */}
                        <div className="mt-6 flex items-center justify-between w-full border-t border-slate-100 pt-3">
                          <span className="text-xl font-extrabold text-emerald-700">
                            {formatCurrency(producto.precio)}
                          </span>
                          {!isAgotado && (
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 rounded-lg px-2.5 py-1 flex items-center gap-1 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                              <PlusCircle size={14} />
                              Vender
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===== MODAL DE VENTA DIRECTA (Pensado para 50+ años, sin complicaciones) ===== */}
        {activeProduct && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Botón cerrar modal */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black text-slate-900">⚡ Registrar Venta</h3>
                <button
                  onClick={closeSellModal}
                  className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              {/* Detalles del producto seleccionados con letras grandes */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Producto Seleccionado</span>
                <h4 className="text-2xl font-black text-slate-900 mt-1 leading-tight">{activeProduct.nombre}</h4>
                <p className="text-sm font-bold text-slate-500 mt-2">
                  Precio unitario: <span className="text-slate-800">{formatCurrency(activeProduct.precio)}</span>
                </p>
                <p className="text-sm font-bold text-slate-500 mt-0.5">
                  Stock disponible: <span className="text-slate-800">{activeProduct.stock} unidades</span>
                </p>
              </div>

              {/* Selector de Cantidad con botones GIGANTES */}
              <div className="mb-6">
                <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-2 text-center">
                  ¿Cuántas unidades vendió?
                </label>
                
                <div className="grid grid-cols-[64px_1fr_64px] gap-4 items-center bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <button
                    disabled={cantidad <= 1}
                    onClick={() => setCantidad((current) => Math.max(1, current - 1))}
                    type="button"
                    className="flex h-14 items-center justify-center rounded-xl bg-white border-2 border-slate-300 text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus size={26} strokeWidth={3} />
                  </button>
                  <input
                    className="h-14 bg-transparent text-center text-3xl font-black text-slate-900 outline-none w-full border-none focus:ring-0"
                    min="1"
                    max={activeProduct.stock}
                    onChange={(event) => {
                      const val = Math.max(1, Number(event.target.value));
                      setCantidad(Math.min(activeProduct.stock, val));
                    }}
                    type="number"
                    value={cantidad}
                  />
                  <button
                    disabled={cantidad >= activeProduct.stock}
                    onClick={() => setCantidad((current) => Math.min(activeProduct.stock, current + 1))}
                    type="button"
                    className="flex h-14 items-center justify-center rounded-xl bg-white border-2 border-slate-300 text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus size={26} strokeWidth={3} />
                  </button>
                </div>

                {/* BOTONES RÁPIDOS de cantidad (Excelente UX para adultos) */}
                <div className="mt-3 flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      disabled={num > activeProduct.stock}
                      onClick={() => setCantidad(num)}
                      type="button"
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-black transition active:scale-95 ${
                        cantidad === num
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuadro del Total en color verde vivo */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 p-5 text-white shadow-md shadow-emerald-100 mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">
                  Total a cobrar al cliente
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight">
                  {formatCurrency(total)}
                </p>
              </div>

              {/* Botón de Confirmación Gigante */}
              <div className="space-y-2">
                <button
                  disabled={isSaving}
                  onClick={handleConfirmarVenta}
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 hover:bg-slate-800 py-4.5 text-lg font-black text-white shadow-lg transition active:scale-[0.97]"
                >
                  {isSaving ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      <span>Guardando venta...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={22} strokeWidth={2.5} />
                      <span>Confirmar Venta</span>
                    </>
                  )}
                </button>
                <button
                  onClick={closeSellModal}
                  type="button"
                  className="w-full text-center text-slate-500 hover:text-slate-800 py-2 text-sm font-bold"
                >
                  Cancelar y volver atrás
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
