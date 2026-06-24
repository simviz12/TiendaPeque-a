"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type LoginResponse = {
  user?: {
    rol: "ADMIN" | "VENDEDOR";
  };
  message?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!usuario.trim() || !password.trim()) {
      toast.error("Por favor ingresa usuario y contraseña.");
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.user) {
        toast.error(data.message ?? "Usuario o contraseña incorrectos.");
        return;
      }

      toast.success("¡Bienvenido! Ingresando...");
      router.replace(data.user.rol === "ADMIN" ? "/admin" : "/vendedor");
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    marginTop: "0.5rem",
    height: "58px",
    width: "100%",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    padding: "0 1rem",
    fontSize: "1.1rem",
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    fontWeight: 500,
    color: "#0f172a",
    background: "#f8fafc",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
    boxSizing: "border-box",
  };

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Usuario */}
      <label style={{ display: "block" }}>
        <span
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "#1e293b",
            display: "block",
            marginBottom: "0.25rem",
          }}
        >
          Usuario
        </span>
        <input
          style={inputStyle}
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="Escribe tu usuario"
          autoComplete="username"
          autoFocus
          disabled={isLoading}
          onFocus={(e) => {
            e.target.style.borderColor = "#f43f5e";
            e.target.style.boxShadow = "0 0 0 4px rgba(244,63,94,0.12)";
            e.target.style.background = "#ffffff";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e2e8f0";
            e.target.style.boxShadow = "none";
            e.target.style.background = "#f8fafc";
          }}
        />
      </label>

      {/* Contraseña */}
      <label style={{ display: "block" }}>
        <span
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "#1e293b",
            display: "block",
            marginBottom: "0.25rem",
          }}
        >
          Contraseña
        </span>
        <div style={{ position: "relative" }}>
          <input
            style={{ ...inputStyle, paddingRight: "3.5rem" }}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Escribe tu contraseña"
            autoComplete="current-password"
            disabled={isLoading}
            onFocus={(e) => {
              e.target.style.borderColor = "#f43f5e";
              e.target.style.boxShadow = "0 0 0 4px rgba(244,63,94,0.12)";
              e.target.style.background = "#ffffff";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "none";
              e.target.style.background = "#f8fafc";
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
            }}
          >
            {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          marginTop: "0.5rem",
          height: "62px",
          width: "100%",
          borderRadius: "14px",
          border: "none",
          background: isLoading
            ? "#94a3b8"
            : "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
          color: "white",
          fontSize: "1.15rem",
          fontWeight: 800,
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          cursor: isLoading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.6rem",
          boxShadow: isLoading ? "none" : "0 4px 20px rgba(225,29,72,0.25)",
          transition: "all 0.2s",
          letterSpacing: "0.01em",
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(225,29,72,0.35)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = isLoading
            ? "none"
            : "0 4px 20px rgba(225,29,72,0.25)";
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={22} className="animate-spin" />
            Entrando...
          </>
        ) : (
          "Entrar al sistema"
        )}
      </button>
    </form>
  );
}
