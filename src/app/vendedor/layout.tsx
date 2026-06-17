import Link from "next/link";
import { History, ShoppingCart, Calculator, ShoppingBag } from "lucide-react";
import { LogoutButton } from "@/presentation/components/logout-button";

const navigation = [
  { href: "/vendedor/vender", label: "Vender", icon: ShoppingCart, desc: "Nueva Venta" },
  { href: "/vendedor/historial", label: "Mi Historial", icon: History, desc: "Ventas del día" },
  { href: "/vendedor/cierre-caja", label: "Cerrar Caja", icon: Calculator, desc: "Cierre diario" },
];

export default function VendedorLayout({
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
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ===== HEADER BAR ===== */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "1rem 1.5rem",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          {/* Logo & Role info */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexGrow: 1 }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(22,163,74,0.25)",
              }}
            >
              <ShoppingBag size={24} color="white" />
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#16a34a",
                  margin: 0,
                }}
              >
                Punto de Venta
              </p>
              <h2
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 900,
                  color: "#0f172a",
                  margin: 0,
                }}
              >
                Tienda Casera
              </h2>
            </div>
          </div>

          {/* Navigation Links and Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <nav style={{ display: "flex", gap: "0.5rem" }}>
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.625rem 1rem",
                    borderRadius: "10px",
                    textDecoration: "none",
                    color: "#475569",
                    transition: "all 0.15s ease",
                    minHeight: "52px",
                  }}
                  className="nav-link-vendedor"
                >
                  <item.icon size={20} strokeWidth={2.2} style={{ color: "#16a34a" }} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", lineHeight: 1.1 }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "1px" }}>
                      {item.desc}
                    </span>
                  </div>
                </Link>
              ))}
            </nav>

            <div
              style={{
                borderLeft: "1px solid #e2e8f0",
                paddingLeft: "1.25rem",
                display: "flex",
                alignItems: "center",
              }}
            >
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "1.5rem" }}>
        {children}
      </main>

      <style>{`
        .nav-link-vendedor:hover {
          background: #f0fdf4 !important;
        }
        .nav-link-vendedor:hover span {
          color: #16a34a !important;
        }
        @media (max-width: 768px) {
          header > div {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          nav {
            width: 100% !important;
            justify-content: space-between !important;
          }
          div[style*="borderLeft: 1px solid"] {
            border-left: none !important;
            padding-left: 0 !important;
            width: 100% !important;
            justify-content: center !important;
            margin-top: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
