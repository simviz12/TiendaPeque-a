import Link from "next/link";
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  PackageSearch,
  ScrollText,
  ShoppingBag,
} from "lucide-react";
import { LogoutButton } from "@/presentation/components/logout-button";

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Resumen del negocio" },
  { href: "/admin/inventario", label: "Inventario", icon: PackageSearch, desc: "Productos y precios" },
  { href: "/admin/ventas", label: "Ventas", icon: ClipboardList, desc: "Historial de ventas" },
  { href: "/admin/cierre-caja", label: "Cerrar Caja", icon: Calculator, desc: "Caja del día" },
  { href: "/admin/logs", label: "Logs", icon: ScrollText, desc: "Registro del sistema" },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        display: "grid",
        gridTemplateColumns: "300px 1fr",
      }}
    >
      {/* ===== SIDEBAR ===== */}
      <aside
        style={{
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: "1.75rem 1.5rem 1.5rem",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
              }}
            >
              <ShoppingBag size={28} color="white" strokeWidth={2} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#16a34a",
                  margin: 0,
                }}
              >
                Administrador
              </p>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  color: "#0f172a",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Tienda Casera
              </h2>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: "1rem 0.875rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#94a3b8",
              padding: "0.25rem 0.625rem 0.5rem",
              margin: 0,
            }}
          >
            Menú principal
          </p>
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                padding: "0.875rem 1rem",
                borderRadius: "12px",
                textDecoration: "none",
                color: "#374151",
                transition: "all 0.15s ease",
                minHeight: "64px",
              }}
              className="nav-link-admin"
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#f0fdf4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#16a34a",
                }}
              >
                <item.icon size={22} strokeWidth={2.2} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#1e293b",
                    lineHeight: 1.2,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748b",
                    marginTop: "1px",
                  }}
                >
                  {item.desc}
                </div>
              </div>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div
          style={{
            padding: "1rem 0.875rem 1.5rem",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <LogoutButton />
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main style={{ minWidth: 0, minHeight: "100vh" }}>{children}</main>

      <style>{`
        .nav-link-admin:hover {
          background: #f0fdf4 !important;
          color: #16a34a !important;
        }
        .nav-link-admin:hover > div:first-child {
          background: #dcfce7 !important;
        }
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 300px"] {
            grid-template-columns: 1fr !important;
          }
          aside[style*="position: sticky"] {
            position: relative !important;
            height: auto !important;
            min-height: unset !important;
          }
        }
      `}</style>
    </div>
  );
}
