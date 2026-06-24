"use client";

import { useState } from "react";
import Link from "next/link";
import { History, ShoppingCart, Calculator, ShoppingBag, Menu, X, BookUser } from "lucide-react";
import { LogoutButton } from "@/presentation/components/logout-button";

const navigation = [
  { href: "/vendedor/vender", label: "Vender", icon: ShoppingCart, desc: "Nueva Venta" },
  { href: "/vendedor/fiados", label: "Fiados", icon: BookUser, desc: "Cuentas por cobrar" },
  { href: "/vendedor/historial", label: "Mi Historial", icon: History, desc: "Ventas del día" },
  { href: "/vendedor/cierre-caja", label: "Cerrar Caja", icon: Calculator, desc: "Cierre diario" },
];

export default function VendedorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      
      {/* ===== HEADER BAR (Desktop & Mobile) ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-md shadow-primary-600/10">
              <ShoppingBag size={20} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 leading-none mb-1">
                Punto de Venta
              </p>
              <h2 className="text-base font-black leading-tight text-slate-900">
                Tienda Casera
              </h2>
            </div>
          </div>

          {/* Navigation links (Desktop only) */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-xl px-4 py-2 text-slate-600 hover:bg-primary-50 hover:text-primary-700 transition"
              >
                <item.icon size={18} strokeWidth={2.2} className="text-primary-600" />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-slate-800 leading-tight">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.desc}
                  </span>
                </div>
              </Link>
            ))}
          </nav>

          {/* Logout button (Desktop only) */}
          <div className="hidden md:block border-l border-slate-200 pl-4">
            <LogoutButton />
          </div>

          {/* Hamburger Menu Button (Mobile only) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-primary-50 hover:text-primary-700 transition md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </header>

      {/* ===== MOBILE DROPDOWN MENU ===== */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[65px] z-40 bg-white/95 backdrop-blur-md md:hidden flex flex-col p-6 shadow-lg border-b border-slate-200 max-h-[calc(100vh-65px)] overflow-y-auto">
          <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Navegación Vendedor</p>
          <nav className="flex flex-col gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-4 rounded-xl px-4 py-3 text-slate-600 hover:bg-primary-50 hover:text-primary-700 transition-all active:scale-[0.98]"
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

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

    </div>
  );
}
