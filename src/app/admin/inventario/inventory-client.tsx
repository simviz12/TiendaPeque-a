"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Edit3, PackagePlus, Search, Trash2, X, PlusCircle, Tag } from "lucide-react";
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
  costo: string;
  stock: number;
  esDePaquete: boolean;
};

type ProductFormState = {
  id?: string;
  nombre: string;
  categoriaId: string;
  precio: string;
  costo: string;
  stock: string;
  esDePaquete: boolean;
  cantidadPorPaquete: string;
  numeroDePaquetes: string;
};

type CategoryFormState = {
  id?: string;
  nombre: string;
  tipo: "normal" | "sensible";
};

const emptyProductForm: ProductFormState = {
  nombre: "",
  categoriaId: "",
  precio: "",
  costo: "",
  stock: "0",
  esDePaquete: false,
  cantidadPorPaquete: "",
  numeroDePaquetes: "",
};

const emptyCategoryForm: CategoryFormState = {
  nombre: "",
  tipo: "normal",
};

function formatCurrency(value: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function InventoryClient() {
  const [activeTab, setActiveTab] = useState<"productos" | "categorias">("productos");
  
  // Products states
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [isProductSaving, setIsProductSaving] = useState(false);

  // Categories states
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [isCategorySaving, setIsCategorySaving] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  async function loadInventory() {
    setIsLoading(true);
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch("/api/productos"),
        fetch("/api/categorias"),
      ]);

      if (!productsResponse.ok || !categoriesResponse.ok) {
        toast.error("No se pudo cargar el inventario.");
        return;
      }

      const productsData = await productsResponse.json();
      const categoriesData = await categoriesResponse.json();

      setProductos(productsData.productos || productsData.data || []);
      setCategorias(categoriesData.categorias || categoriesData.data || []);
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadInventory();
  }, []);

  // Products filtering & search
  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();
    return productos.filter((producto) => {
      const matchesSearch = producto.nombre.toLowerCase().includes(normalizedSearch);
      const matchesCategory = categoryFilter === "todas" || producto.categoriaId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, productos, productSearch]);

  const groupedProducts = useMemo(() => {
    return categorias
      .map((categoria) => ({
        categoria,
        productos: filteredProducts.filter((producto) => producto.categoriaId === categoria.id),
      }))
      .filter((group) => group.productos.length > 0);
  }, [categorias, filteredProducts]);

  // Categories filtering & search
  const filteredCategories = useMemo(() => {
    const normalizedSearch = categorySearch.trim().toLowerCase();
    return categorias.filter((cat) => cat.nombre.toLowerCase().includes(normalizedSearch));
  }, [categorias, categorySearch]);

  // Product Actions
  function openCreateProductModal() {
    setProductForm({
      ...emptyProductForm,
      categoriaId: categorias[0]?.id ?? "",
    });
    setIsProductModalOpen(true);
  }

  function openEditProductModal(producto: Producto) {
    setProductForm({
      id: producto.id,
      nombre: producto.nombre,
      categoriaId: producto.categoriaId,
      precio: producto.precio,
      costo: producto.costo,
      stock: String(producto.stock),
      esDePaquete: producto.esDePaquete,
      cantidadPorPaquete: "",
      numeroDePaquetes: "",
    });
    setIsProductModalOpen(true);
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsProductSaving(true);

    const isEditing = Boolean(productForm.id);
    const url = isEditing ? `/api/productos/${productForm.id}` : "/api/productos";
    const payload = {
      nombre: productForm.nombre,
      categoriaId: productForm.categoriaId,
      precio: productForm.precio,
      costo: productForm.costo,
      stock: Number(productForm.stock),
      esDePaquete: productForm.esDePaquete,
      cantidadPorPaquete: productForm.esDePaquete ? Number(productForm.cantidadPorPaquete) : undefined,
      numeroDePaquetes: productForm.esDePaquete ? Number(productForm.numeroDePaquetes) : undefined,
    };

    try {
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || data.error || "No se pudo guardar el producto.");
        return;
      }

      toast.success(isEditing ? "Producto actualizado." : "Producto creado.");
      setIsProductModalOpen(false);
      await loadInventory();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsProductSaving(false);
    }
  }

  async function handleProductDelete(producto: Producto) {
    const confirmed = window.confirm(`¿Eliminar el producto "${producto.nombre}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/productos/${producto.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: producto.id })
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || data.error || "No se pudo eliminar el producto.");
        return;
      }

      toast.success("Producto eliminado.");
      await loadInventory();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    }
  }

  // Category Actions
  function openCreateCategoryModal() {
    setCategoryForm(emptyCategoryForm);
    setIsCategoryModalOpen(true);
  }

  function openEditCategoryModal(categoria: Categoria) {
    setCategoryForm({
      id: categoria.id,
      nombre: categoria.nombre,
      tipo: categoria.tipo,
    });
    setIsCategoryModalOpen(true);
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCategorySaving(true);

    const isEditing = Boolean(categoryForm.id);
    const url = "/api/categorias";
    const payload = {
      id: categoryForm.id,
      nombre: categoryForm.nombre,
      tipo: categoryForm.tipo,
    };

    try {
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || data.error || "No se pudo guardar la categoría.");
        return;
      }

      toast.success(isEditing ? "Categoría actualizada." : "Categoría creada.");
      setIsCategoryModalOpen(false);
      await loadInventory();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsCategorySaving(false);
    }
  }

  async function handleCategoryDelete(categoria: Categoria) {
    const confirmed = window.confirm(
      `¿Eliminar la categoría "${categoria.nombre}"? Esto podría afectar a los productos asociados.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch("/api/categorias", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoria.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || data.error || "No se pudo eliminar la categoría.");
        return;
      }

      toast.success("Categoría eliminada.");
      await loadInventory();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 lg:px-10 bg-slate-50/50">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl flex-col gap-6 border-b border-slate-200/80 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-primary-600">
            Módulo de Administración
          </p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900">
            Inventario General
          </h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Administra tus productos y categorías de forma simple con búsqueda inteligente y reportes automáticos.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            className="flex items-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-3.5 text-sm font-bold shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
            onClick={openCreateCategoryModal}
            type="button"
          >
            <Tag size={18} />
            Nueva categoría
          </button>
          
          <button
            className="flex items-center gap-2 rounded-xl bg-primary-600 text-white px-5 py-3.5 text-sm font-bold shadow-md shadow-primary-600/10 transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100"
            onClick={openCreateProductModal}
            type="button"
          >
            <PackagePlus size={18} />
            Nuevo producto
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto mt-8 max-w-6xl">
        <div className="flex border-b border-slate-200">
          <button
            className={`px-6 py-3 text-base font-bold transition-all border-b-2 ${
              activeTab === "productos"
                ? "border-primary-600 text-primary-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("productos")}
          >
            Productos ({productos.length})
          </button>
          <button
            className={`px-6 py-3 text-base font-bold transition-all border-b-2 ${
              activeTab === "categorias"
                ? "border-primary-600 text-primary-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("categorias")}
          >
            Categorías ({categorias.length})
          </button>
        </div>
      </div>

      <section className="mx-auto mt-6 max-w-6xl">
        {isLoading ? (
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-lg font-medium text-slate-500 shadow-sm animate-pulse">
            Cargando inventario...
          </div>
        ) : (
          <>
            {/* PRODUCT TAB */}
            {activeTab === "productos" && (
              <>
                {/* Search / Filter bar */}
                <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                  <div className="relative">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={20}
                    />
                    <input
                      className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Buscar producto por nombre..."
                      value={productSearch}
                    />
                  </div>

                  <select
                    className="h-13 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    value={categoryFilter}
                  >
                    <option value="todas">Todas las categorías</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {groupedProducts.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-12 text-center text-lg text-slate-500 shadow-sm">
                    No se encontraron productos coincidentes.
                  </div>
                ) : (
                  <div className="mt-8 grid gap-8">
                    {groupedProducts.map((group) => (
                      <section key={group.categoria.id} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                            {group.categoria.nombre}
                          </h2>
                          <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            group.categoria.tipo === "sensible"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-slate-100 text-slate-700 border border-slate-200/50"
                          }`}>
                            {group.categoria.tipo}
                          </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {group.productos.map((producto) => (
                            <article
                              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-primary-500/50 hover:shadow-md"
                              key={producto.id}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                                    {producto.nombre}
                                  </h3>
                                  <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Existencia: <span className={producto.stock === 0 ? "text-rose-600 font-bold" : "text-slate-800"}>{producto.stock} uds</span>
                                  </p>
                                </div>
                                {producto.esDePaquete && (
                                  <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-bold">
                                    Paquete
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Precio Venta</p>
                                  <p className="text-base font-extrabold text-slate-800 mt-0.5">
                                    {formatCurrency(producto.precio)}
                                  </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Costo</p>
                                  <p className="text-base font-extrabold text-slate-800 mt-0.5">
                                    {formatCurrency(producto.costo)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-5 grid grid-cols-2 gap-2">
                                <button
                                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                  onClick={() => openEditProductModal(producto)}
                                  type="button"
                                >
                                  <Edit3 size={14} />
                                  Editar
                                </button>
                                <button
                                  className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                                  onClick={() => void handleProductDelete(producto)}
                                  type="button"
                                >
                                  <Trash2 size={14} />
                                  Eliminar
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === "categorias" && (
              <>
                {/* Search bar */}
                <div className="relative">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder="Buscar categorías por nombre..."
                    value={categorySearch}
                  />
                </div>

                {filteredCategories.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-12 text-center text-lg text-slate-500 shadow-sm">
                    No se encontraron categorías coincidentes.
                  </div>
                ) : (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCategories.map((categoria) => {
                      const associatedCount = productos.filter((p) => p.categoriaId === categoria.id).length;
                      
                      return (
                        <article
                          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary-500/50 hover:shadow-md"
                          key={categoria.id}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                                {categoria.nombre}
                              </h3>
                              <p className="mt-1 text-sm font-semibold text-slate-500">
                                {associatedCount} {associatedCount === 1 ? "producto" : "productos"} asociados
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                              categoria.tipo === "sensible"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : "bg-slate-100 text-slate-700 border border-slate-200/50"
                            }`}>
                              {categoria.tipo}
                            </span>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                            <button
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                              onClick={() => openEditCategoryModal(categoria)}
                              type="button"
                            >
                              <Edit3 size={14} />
                              Editar
                            </button>
                            <button
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                              onClick={() => void handleCategoryDelete(categoria)}
                              type="button"
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <form
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-100"
            onSubmit={handleProductSubmit}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary-600">
                  Formulario de Producto
                </p>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                  {productForm.id ? "Editar Producto" : "Agregar Nuevo Producto"}
                </h2>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
                onClick={() => setIsProductModalOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2 block">
                <span className="text-sm font-bold text-slate-700">Nombre del Producto</span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      nombre: event.target.value,
                    }))
                  }
                  required
                  value={productForm.nombre}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Categoría</span>
                <select
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      categoriaId: event.target.value,
                    }))
                  }
                  required
                  value={productForm.categoriaId}
                >
                  <option value="">Seleccionar</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Existencia Inicial (Stock)</span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  disabled={productForm.esDePaquete}
                  min="0"
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      stock: event.target.value,
                    }))
                  }
                  type="number"
                  value={productForm.stock}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Precio Venta (COP)</span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  min="0"
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      precio: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={productForm.precio}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Costo Unitario (COP)</span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  min="0"
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      costo: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={productForm.costo}
                />
              </label>

              <label className="flex h-14 items-center gap-3 rounded-xl border border-slate-200 px-4 md:col-span-2 cursor-pointer bg-slate-50/50 hover:bg-slate-50 select-none">
                <input
                  checked={productForm.esDePaquete}
                  className="h-5 w-5 rounded accent-primary-600"
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      esDePaquete: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span className="text-sm font-bold text-slate-700">Este producto se maneja por paquetes</span>
              </label>

              {productForm.esDePaquete && (
                <>
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">Unidades por paquete</span>
                    <input
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                      min="1"
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          cantidadPorPaquete: event.target.value,
                        }))
                      }
                      required
                      type="number"
                      value={productForm.cantidadPorPaquete}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">Número de paquetes</span>
                    <input
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                      min="1"
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          numeroDePaquetes: event.target.value,
                        }))
                      }
                      required
                      type="number"
                      value={productForm.numeroDePaquetes}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                className="h-12 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setIsProductModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="h-12 rounded-xl bg-primary-600 text-sm font-bold text-white transition hover:bg-primary-700 disabled:bg-slate-350"
                disabled={isProductSaving}
                type="submit"
              >
                {isProductSaving ? "Guardando..." : "Guardar Producto"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <form
            className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-100"
            onSubmit={handleCategorySubmit}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary-600">
                  Formulario de Categoría
                </p>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                  {categoryForm.id ? "Editar Categoría" : "Agregar Categoría"}
                </h2>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
                onClick={() => setIsCategoryModalOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Nombre de la Categoría</span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      nombre: event.target.value,
                    }))
                  }
                  required
                  value={categoryForm.nombre}
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Tipo de Categoría</span>
                <select
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      tipo: event.target.value as "normal" | "sensible",
                    }))
                  }
                  required
                  value={categoryForm.tipo}
                >
                  <option value="normal">Normal</option>
                  <option value="sensible">Sensible (ej. Productos perecederos / delicados)</option>
                </select>
              </label>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                className="h-12 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setIsCategoryModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="h-12 rounded-xl bg-primary-600 text-sm font-bold text-white transition hover:bg-primary-700 disabled:bg-slate-350"
                disabled={isCategorySaving}
                type="submit"
              >
                {isCategorySaving ? "Guardando..." : "Guardar Categoría"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
