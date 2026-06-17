"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  PackageSearch,
  ScrollText,
  ShoppingBag,
  Menu,
  X,
} from "lucide-react";
import { LogoutButton } from "@/presentation/components/logout-button";

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Resumen" },
  { href: "/admin/inventario", label: "Inventario", icon: PackageSearch, desc: "Productos" },
  { href: "/admin/ventas", label: "Ventas", icon: ClipboardList, desc: "Historial" },
  { href: "/admin/cierre-caja", label: "Caja", icon: Calculator, desc: "Cierre" },
  { href: "/admin/logs", label: "Logs", icon: ScrollText, desc: "Sistema" },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      
      {/* ===== HEADER MÓVIL (Solo visible en móviles) ===== */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md">
            <ShoppingBag size={20} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-black leading-tight text-slate-900">Tienda Casera</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Admin</p>
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ===== MENÚ DESPLEGABLE MÓVIL ===== */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[65px] z-40 bg-white/95 backdrop-blur-md md:hidden flex flex-col p-6 shadow-lg border-b border-slate-200 max-h-[calc(100vh-65px)] overflow-y-auto">
          <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Menú Principal</p>
          <nav className="flex flex-col gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-4 rounded-xl px-4 py-3 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                  <item.icon size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700">{item.label}</div>
                  <div className="text-xs text-slate-400">{item.desc}</div>
                </div>
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-100 pt-4 mt-4" onClick={() => setMenuOpen(false)}>
            <LogoutButton />
          </div>
        </div>
      )}

      {/* ===== SIDEBAR DESKTOP (Oculto en móviles) ===== */}
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {/* Brand */}
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-600/20">
              <ShoppingBag size={24} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Administrador</p>
              <h2 className="text-xl font-black leading-tight text-slate-900">Tienda Casera</h2>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Menú Principal</p>
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-[60px] items-center gap-4 rounded-xl px-4 py-3 text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-600">
                <item.icon size={20} strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-sm font-black leading-tight text-slate-700 group-hover:text-emerald-800">{item.label}</div>
                <div className="text-xs font-medium text-slate-400">{item.desc}</div>
              </div>
            </Link>
          ))}
        </nav>

        {/* Logout Desktop */}
        <div className="border-t border-slate-100 p-4">
          <LogoutButton />
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
