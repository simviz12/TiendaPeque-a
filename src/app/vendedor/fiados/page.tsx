"use client";

import { useEffect, useState } from "react";
import { BookUser, CheckCircle2, CircleDollarSign, Search, PlusCircle, X, Receipt } from "lucide-react";
import toast from "react-hot-toast";

type Producto = {
  id: string;
  nombre: string;
};

type VentaItem = {
  id: string;
  producto: Producto;
  cantidad: number;
};

type Transaccion = {
  id: string;
  ventas: VentaItem[];
};

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
};

type Fiado = {
  id: string;
  cliente: Cliente;
  montoTotal: string;
  montoPagado: string;
  estado: "PENDIENTE" | "PAGADO_PARCIAL" | "PAGADO_TOTAL";
  fechaCreacion: string;
  notas: string | null;
  transaccion: Transaccion | null;
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function FiadosPage() {
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [activeFiado, setActiveFiado] = useState<Fiado | null>(null);
  const [abonoAmount, setAbonoAmount] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadFiados() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/fiados?search=${search}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setFiados(data.data);
      } else {
        toast.error(data.error || "Error al cargar los fiados");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFiados();
  }, [search]);

  async function handleAbonar() {
    if (!activeFiado || !abonoAmount || Number(abonoAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/fiados/${activeFiado.id}/abonos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monto: Number(abonoAmount),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Abono registrado correctamente");
        setActiveFiado(null);
        setAbonoAmount("");
        loadFiados();
      } else {
        toast.error(data.error || "Error al registrar el abono");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BookUser className="text-primary-600" />
            Fiados y Cuentas
          </h1>
          <p className="text-sm text-slate-500 font-bold mt-1">
            Gestiona las ventas a crédito y registra los pagos.
          </p>
        </div>
        
        <div className="relative max-w-xs w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-semibold focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
        </div>
      ) : fiados.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <Receipt className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-black text-slate-600">No hay fiados registrados</p>
          <p className="text-slate-500 text-sm mt-1">Busca otro nombre o realiza una venta a crédito.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fiados.map((fiado) => {
            const saldoPendiente = Number(fiado.montoTotal) - Number(fiado.montoPagado);
            const isPagado = fiado.estado === "PAGADO_TOTAL";

            return (
              <div 
                key={fiado.id} 
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${isPagado ? "border-primary-200 bg-primary-50/30" : "border-slate-200"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-black text-lg text-slate-900">{fiado.cliente.nombre}</h3>
                    {fiado.cliente.telefono && (
                      <p className="text-xs text-slate-500 font-bold">{fiado.cliente.telefono}</p>
                    )}
                  </div>
                  {isPagado ? (
                    <span className="bg-primary-100 text-primary-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
                      <CheckCircle2 size={12} /> Pagado
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {fiado.estado === "PAGADO_PARCIAL" ? "Abono Parcial" : "Pendiente"}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-sm font-semibold text-slate-600 mb-4 border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Productos fiados:</p>
                  {fiado.transaccion?.ventas.map((v) => (
                    <p key={v.id} className="text-slate-900 text-xs">
                      • {v.producto.nombre} <span className="text-slate-500 font-bold">(x{v.cantidad})</span>
                    </p>
                  )) ?? <p className="text-slate-400 text-xs">Sin productos vinculados</p>}
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pt-1.5">Fecha:</p>
                  <p className="text-slate-950 text-xs">{new Date(fiado.fechaCreacion).toLocaleDateString()}</p>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Saldo Pendiente</p>
                    <p className={`text-xl font-black ${isPagado ? "text-primary-600" : "text-amber-600"}`}>
                      {formatCurrency(saldoPendiente)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      Total: {formatCurrency(fiado.montoTotal)}
                    </p>
                  </div>
                  
                  {!isPagado && (
                    <button
                      onClick={() => setActiveFiado(fiado)}
                      className="bg-slate-900 text-white rounded-xl px-4 py-2 text-sm font-black flex items-center gap-1.5 hover:bg-slate-800 transition active:scale-95"
                    >
                      <CircleDollarSign size={16} />
                      Abonar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Abonar */}
      {activeFiado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <CircleDollarSign className="text-primary-600" />
                Registrar Abono
              </h3>
              <button
                onClick={() => setActiveFiado(null)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl mb-5 border border-slate-200">
              <p className="text-xs font-bold text-slate-500">Cliente</p>
              <p className="text-lg font-black text-slate-900 mb-2">{activeFiado.cliente.nombre}</p>
              
              <div className="flex justify-between text-sm">
                <span className="font-bold text-slate-500">Deuda Total:</span>
                <span className="font-black text-slate-900">{formatCurrency(activeFiado.montoTotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="font-bold text-slate-500">Pagado hasta hoy:</span>
                <span className="font-black text-primary-600">{formatCurrency(activeFiado.montoPagado)}</span>
              </div>
              <div className="flex justify-between text-base mt-3 pt-3 border-t border-slate-200">
                <span className="font-black text-slate-900">Saldo Pendiente:</span>
                <span className="font-black text-amber-600">
                  {formatCurrency(Number(activeFiado.montoTotal) - Number(activeFiado.montoPagado))}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-black uppercase text-slate-600 mb-2">
                Monto a Pagar Hoy
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">$</span>
                <input
                  type="number"
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl py-3 pl-8 pr-4 text-xl font-black focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition"
                  placeholder="0"
                />
              </div>
            </div>

            <button
              onClick={handleAbonar}
              disabled={isSubmitting || !abonoAmount || Number(abonoAmount) <= 0 || Number(abonoAmount) > (Number(activeFiado.montoTotal) - Number(activeFiado.montoPagado))}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3.5 font-black text-lg flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              {isSubmitting ? (
                 <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  <PlusCircle size={20} strokeWidth={2.5} />
                  Guardar Pago
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
