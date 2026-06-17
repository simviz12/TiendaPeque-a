import { LoginForm } from "./login-form";
import { ShoppingBag } from "lucide-react";

export const metadata = {
  title: "Iniciar Sesión — Tienda Casera",
  description: "Ingresa con tu usuario y contraseña para acceder al sistema.",
};

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 40%, #bbf7d0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-120px",
          right: "-120px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "rgba(22,163,74,0.12)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "-80px",
          left: "-80px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "rgba(16,185,129,0.10)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: "460px", position: "relative", zIndex: 1 }}>
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              boxShadow: "0 8px 32px rgba(22,163,74,0.35)",
              marginBottom: "1.25rem",
            }}
          >
            <ShoppingBag size={42} color="white" strokeWidth={2} />
          </div>
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Tienda Casera
          </h1>
          <p
            style={{
              marginTop: "0.6rem",
              fontSize: "1.1rem",
              color: "#475569",
              fontWeight: 500,
            }}
          >
            Sistema de ventas e inventario
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)",
            padding: "2.5rem 2rem",
            border: "1px solid rgba(22,163,74,0.12)",
          }}
        >
          <div style={{ marginBottom: "1.75rem" }}>
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Iniciar sesión
            </h2>
            <p
              style={{
                marginTop: "0.4rem",
                fontSize: "1rem",
                color: "#64748b",
              }}
            >
              Usa tu usuario y contraseña para entrar.
            </p>
          </div>

          <LoginForm />
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.9rem",
            color: "#64748b",
          }}
        >
          © 2025 Tienda Casera · Sistema interno
        </p>
      </div>
    </main>
  );
}
