"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search, Download, Calendar, Users, ShoppingBag } from "lucide-react";

type Venta = {
  id: string;
  cantidad: number;
  total: string;
  fecha: string;
  producto: {
    nombre: string;
    precio: string;
    categoria: {
      nombre: string;
    };
  };
  vendedor: {
    nombre: string;
    usuario: string;
  };
};

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

export function SalesAdminClient() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [productSearch, setProductSearch] = useState("");
  const [sellerFilter, setSellerFilter] = useState("todos");
  const [timeFilter, setTimeFilter] = useState("todos"); // 'hoy', 'semana', 'mes', 'todos'

  async function loadSales() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ventas");
      const data = await response.json();
      const list = data.ventas || data.data;

      if (!response.ok || !list) {
        toast.error(data.message ?? "No se pudo cargar el historial de ventas.");
        return;
      }
      setVentas(list);
    } catch {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSales();
  }, []);

  // Filter options for Sellers dynamically derived from data
  const sellers = useMemo(() => {
    const set = new Set<string>();
    const list: { id: string; name: string }[] = [];
    
    for (const v of ventas) {
      if (v.vendedor && !set.has(v.vendedor.usuario)) {
        set.add(v.vendedor.usuario);
        list.push({ id: v.vendedor.usuario, name: v.vendedor.nombre });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [ventas]);

  // Apply filtering
  const filteredSales = useMemo(() => {
    return ventas.filter((v) => {
      // 1. Product search
      const matchesProduct = v.producto?.nombre
        .toLowerCase()
        .includes(productSearch.trim().toLowerCase());

      // 2. Seller filter
      const matchesSeller =
        sellerFilter === "todos" || v.vendedor?.usuario === sellerFilter;

      // 3. Time filter
      let matchesTime = true;
      const saleDate = new Date(v.fecha);
      const now = new Date();

      if (timeFilter === "hoy") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchesTime = saleDate >= todayStart;
      } else if (timeFilter === "semana") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesTime = saleDate >= weekAgo;
      } else if (timeFilter === "mes") {
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        matchesTime = saleDate >= monthAgo;
      }

      return matchesProduct && matchesSeller && matchesTime;
    });
  }, [ventas, productSearch, sellerFilter, timeFilter]);

  // Calculate statistics from filtered sales
  const stats = useMemo(() => {
    let totalRecaudado = 0;
    let totalTransacciones = filteredSales.length;

    for (const v of filteredSales) {
      totalRecaudado += Number(v.total);
    }

    const ticketPromedio = totalTransacciones > 0 ? totalRecaudado / totalTransacciones : 0;

    return {
      totalRecaudado,
      totalTransacciones,
      ticketPromedio,
    };
  }, [filteredSales]);

  // Build direct export URL based on time filter
  const exportUrl = useMemo(() => {
    const baseUrl = "/api/exportar";
    const now = new Date();
    let startDateStr = "";
    let endDateStr = now.toISOString();

    if (timeFilter === "hoy") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDateStr = todayStart.toISOString();
    } else if (timeFilter === "semana") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      startDateStr = weekAgo.toISOString();
    } else if (timeFilter === "mes") {
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      startDateStr = monthAgo.toISOString();
    }

    if (startDateStr) {
      return `${baseUrl}?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`;
    }
    return baseUrl;
  }, [timeFilter]);

  return (
    <div style={{ padding: "2rem" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
          borderBottom: "2px solid #e2e8f0",
          paddingBottom: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <p style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", color: "#16a34a", margin: 0 }}>
            Administrador
          </p>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#0f172a", margin: "0.25rem 0 0" }}>
            Historial de Ventas
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#64748b", margin: "0.5rem 0 0" }}>
            Revisa, filtra y exporta todas las transacciones realizadas en la tienda.
          </p>
        </div>

        {/* Export Button */}
        <a
          href={exportUrl}
          download="ventas.xlsx"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1.5rem",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            color: "#ffffff",
            fontSize: "1.1rem",
            fontWeight: 800,
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(22,163,74,0.3)",
            transition: "all 0.2s",
            minHeight: "56px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(22,163,74,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(22,163,74,0.3)";
          }}
        >
          <Download size={22} />
          Exportar a Excel
        </a>
      </header>

      {/* Metrics Cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            background: "#ffffff",
            padding: "1.75rem",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        >
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "#64748b", margin: 0 }}>Total Recaudado</p>
          <p style={{ fontSize: "2.25rem", fontWeight: 900, color: "#0f172a", margin: "0.5rem 0 0" }}>
            {formatCurrency(stats.totalRecaudado)}
          </p>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            background: "#ffffff",
            padding: "1.75rem",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        >
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "#64748b", margin: 0 }}>Transacciones</p>
          <p style={{ fontSize: "2.25rem", fontWeight: 900, color: "#0f172a", margin: "0.5rem 0 0" }}>
            {stats.totalTransacciones} <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#94a3b8" }}>ventas</span>
          </p>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            background: "#ffffff",
            padding: "1.75rem",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        >
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "#64748b", margin: 0 }}>Ticket Promedio</p>
          <p style={{ fontSize: "2.25rem", fontWeight: 900, color: "#0f172a", margin: "0.5rem 0 0" }}>
            {formatCurrency(stats.ticketPromedio)}
          </p>
        </div>
      </section>

      {/* Filters Form */}
      <section
        style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          marginBottom: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          alignItems: "end",
        }}
      >
        {/* Search Input */}
        <div>
          <label style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "0.5rem" }}>
            Buscar Producto
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Ej. Cerveza, Huevo..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{
                width: "100%",
                height: "52px",
                padding: "0 1rem 0 2.75rem",
                fontSize: "1.05rem",
                borderRadius: "10px",
                border: "2px solid #e2e8f0",
                outline: "none",
                background: "#f8fafc",
                boxSizing: "border-box",
              }}
            />
            <Search
              size={20}
              style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            />
          </div>
        </div>

        {/* Seller Filter */}
        <div>
          <label style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "0.5rem" }}>
            Filtrar por Vendedor
          </label>
          <select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            style={{
              width: "100%",
              height: "52px",
              padding: "0 1rem",
              fontSize: "1.05rem",
              borderRadius: "10px",
              border: "2px solid #e2e8f0",
              outline: "none",
              background: "#f8fafc",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          >
            <option value="todos">Todos los vendedores</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter Quick Actions */}
        <div>
          <label style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "0.5rem" }}>
            Filtrar por Fecha
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["todos", "hoy", "semana", "mes"].map((opt) => (
              <button
                key={opt}
                onClick={() => setTimeFilter(opt)}
                style={{
                  flex: 1,
                  height: "52px",
                  borderRadius: "10px",
                  border: timeFilter === opt ? "2px solid #16a34a" : "2px solid #e2e8f0",
                  background: timeFilter === opt ? "#f0fdf4" : "#ffffff",
                  color: timeFilter === opt ? "#15803d" : "#475569",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  textTransform: "capitalize",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {opt === "todos" ? "Todo" : opt === "semana" ? "7 días" : opt === "mes" ? "30 días" : opt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sales Table */}
      <section
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "3rem", textAlign: "center", fontSize: "1.2rem", fontWeight: 700, color: "#64748b" }}>
            Cargando historial de ventas...
          </div>
        ) : filteredSales.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#64748b" }}>
            <ShoppingBag size={48} style={{ margin: "0 auto 1rem", color: "#cbd5e1" }} />
            <p style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>No se encontraron ventas</p>
            <p style={{ fontSize: "1rem", margin: "0.25rem 0 0" }}>Prueba a cambiar los filtros o los términos de búsqueda.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "800px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "1.25rem 1.5rem", fontSize: "1.05rem", fontWeight: 800, color: "#1e293b" }}>Fecha</th>
                  <th style={{ padding: "1.25rem 1.5rem", fontSize: "1.05rem", fontWeight: 800, color: "#1e293b" }}>Producto</th>
                  <th style={{ padding: "1.25rem 1.5rem", fontSize: "1.05rem", fontWeight: 800, color: "#1e293b" }}>Categoría</th>
                  <th style={{ padding: "1.25rem 1.5rem", fontSize: "1.05rem", fontWeight: 800, color: "#1e293b" }}>Vendedor</th>
                  <th style={{ padding: "1.25rem 1.5rem", fontSize: "1.05rem", fontWeight: 800, color: "#1e293b", textAlign: "center" }}>Cantidad</th>
                  <th style={{ padding: "1.25rem 1.5rem", fontSize: "1.05rem", fontWeight: 800, color: "#1e293b", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((v, idx) => (
                  <tr
                    key={v.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <td style={{ padding: "1.25rem 1.5rem", fontSize: "1.05rem", fontWeight: 700, color: "#334155" }}>
                      {formatDate(v.fecha)}
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem", fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
                      {v.producto?.nombre ?? "-"}
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem", fontSize: "1.05rem", color: "#475569" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "99px",
                          background: "#e2e8f0",
                          fontSize: "0.9rem",
                          fontWeight: 700,
                        }}
                      >
                        {v.producto?.categoria?.nombre ?? "Otros"}
                      </span>
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem", fontSize: "1.05rem", fontWeight: 700, color: "#475569" }}>
                      {v.vendedor?.nombre ?? "-"}
                    </td>
                    <td
                      style={{
                        padding: "1.25rem 1.5rem",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        textAlign: "center",
                      }}
                    >
                      {v.cantidad}
                    </td>
                    <td
                      style={{
                        padding: "1.25rem 1.5rem",
                        fontSize: "1.15rem",
                        fontWeight: 900,
                        color: "#16a34a",
                        textAlign: "right",
                      }}
                    >
                      {formatCurrency(v.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
