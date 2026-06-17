"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Sesion cerrada.");
      // Usar window.location.href fuerza una recarga completa del navegador (Hard Reload)
      // Esto destruye el caché de memoria de React/Next.js y evita por completo el error del botón "Atrás"
      window.location.href = "/login";
    } catch {
      toast.error("No se pudo cerrar la sesion.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-bold text-slate-800 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isLoading}
      onClick={handleLogout}
      type="button"
    >
      <LogOut aria-hidden="true" size={20} />
      {isLoading ? "Saliendo..." : "Salir"}
    </button>
  );
}
