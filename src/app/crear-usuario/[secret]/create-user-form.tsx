"use client";

import { FormEvent, useState } from "react";

type Props = {
  secret: string;
};

type Role = "ADMIN" | "VENDEDOR";

export function CreateUserForm({ secret }: Props) {
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Role>("ADMIN");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/setup/users/${encodeURIComponent(secret)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, usuario, password, rol }),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        setMessage(data.error ?? "No se pudo crear el usuario.");
        return;
      }

      setNombre("");
      setUsuario("");
      setPassword("");
      setRol("VENDEDOR");
      setMessage("Usuario creado correctamente.");
    } catch {
      setMessage("Error de conexion creando el usuario.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-bold text-slate-700">Nombre</span>
        <input
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base font-semibold outline-none focus:border-primary-500"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-slate-700">Usuario</span>
        <input
          value={usuario}
          onChange={(event) => setUsuario(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base font-semibold outline-none focus:border-primary-500"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-slate-700">Contrasena</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base font-semibold outline-none focus:border-primary-500"
          minLength={8}
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-slate-700">Rol</span>
        <select
          value={rol}
          onChange={(event) => setRol(event.target.value as Role)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base font-semibold outline-none focus:border-primary-500"
        >
          <option value="ADMIN">Admin</option>
          <option value="VENDEDOR">Vendedor</option>
        </select>
      </label>

      {message && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 text-base font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Creando..." : "Crear usuario"}
      </button>
    </form>
  );
}
