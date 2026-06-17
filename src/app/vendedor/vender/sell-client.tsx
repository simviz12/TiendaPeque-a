"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
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
  const [selectedProductId, setSelectedProductId] = useState("");
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
      setSelectedCategoryId(productList[0]?.categoriaId ?? "");
      setSelectedProductId(productList[0]?.id ?? "");
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

  const filteredProducts = useMemo(() => {
    return productos.filter(
      (producto) => producto.categoriaId === selectedCategoryId,
    );
  }, [productos, selectedCategoryId]);

  const selectedProduct = productos.find(
    (producto) => producto.id === selectedProductId,
  );
  const total = selectedProduct ? Number(selectedProduct.precio) * cantidad : 0;

  function selectCategory(categoryId: string) {
    const nextProduct = productos.find(
      (producto) => producto.categoriaId === categoryId,
    );

    setSelectedCategoryId(categoryId);
    setSelectedProductId(nextProduct?.id ?? "");
    setCantidad(1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) {
      toast.error("Selecciona un producto.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/ventas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productoId: selectedProduct.id,
          cantidad,
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(data.message ?? "No se pudo registrar la venta.");
        return;
      }

      toast.success("Venta registrada.");
      setCantidad(1);
      await loadProducts();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6">
      <section className="mx-auto max-w-6xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-base font-bold uppercase tracking-wide text-emerald-700">
            Vendedor
          </p>
          <h1 className="mt-2 text-4xl font-black">Vender</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-700">
            Selecciona categoria, producto y cantidad. El sistema descuenta el
            inventario automaticamente.
          </p>
        </header>

        {isLoading ? (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-lg font-bold text-slate-700">
            Cargando productos...
          </div>
        ) : (
          <form
            className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]"
            onSubmit={handleSubmit}
          >
            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-black">Categorias</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {categorias.map((categoria) => (
                    <button
                      className={`min-h-16 rounded-lg border px-4 text-left text-lg font-black transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
                        selectedCategoryId === categoria.id
                          ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                      }`}
                      key={categoria.id}
                      onClick={() => selectCategory(categoria.id)}
                      type="button"
                    >
                      {categoria.nombre}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-black">Productos</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((producto) => (
                    <button
                      className={`min-h-28 rounded-lg border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
                        selectedProductId === producto.id
                          ? "border-emerald-700 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-100"
                      }`}
                      disabled={producto.stock <= 0}
                      key={producto.id}
                      onClick={() => {
                        setSelectedProductId(producto.id);
                        setCantidad(1);
                      }}
                      type="button"
                    >
                      <span className="block text-xl font-black">
                        {producto.nombre}
                      </span>
                      <span className="mt-2 block text-lg font-bold text-slate-700">
                        {formatCurrency(producto.precio)}
                      </span>
                      <span className="mt-1 block text-base font-bold text-slate-500">
                        Stock: {producto.stock}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black">Resumen</h2>
              <p className="mt-3 text-lg font-bold text-slate-700">
                {selectedProduct?.nombre ?? "Sin producto"}
              </p>
              <p className="mt-1 text-base text-slate-500">
                Stock disponible: {selectedProduct?.stock ?? 0}
              </p>

              <div className="mt-5">
                <p className="text-lg font-black">Cantidad</p>
                <div className="mt-2 grid grid-cols-[56px_1fr_56px] gap-3">
                  <button
                    className="flex h-14 items-center justify-center rounded-lg border border-slate-300 transition hover:bg-slate-100"
                    onClick={() => setCantidad((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    <Minus aria-hidden="true" size={24} />
                  </button>
                  <input
                    className="h-14 rounded-lg border border-slate-300 text-center text-2xl font-black outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    min="1"
                    onChange={(event) =>
                      setCantidad(Math.max(1, Number(event.target.value)))
                    }
                    type="number"
                    value={cantidad}
                  />
                  <button
                    className="flex h-14 items-center justify-center rounded-lg border border-slate-300 transition hover:bg-slate-100"
                    onClick={() =>
                      setCantidad((current) =>
                        Math.min(selectedProduct?.stock ?? current + 1, current + 1),
                      )
                    }
                    type="button"
                  >
                    <Plus aria-hidden="true" size={24} />
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-slate-50 p-4">
                <p className="text-base font-bold text-slate-500">Total</p>
                <p className="text-3xl font-black">{formatCurrency(total)}</p>
              </div>

              <button
                className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-emerald-700 px-5 text-xl font-black text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={!selectedProduct || isSaving}
                type="submit"
              >
                <ShoppingCart aria-hidden="true" size={26} />
                {isSaving ? "Registrando..." : "Registrar venta"}
              </button>
            </aside>
          </form>
        )}
      </section>
    </main>
  );
}
