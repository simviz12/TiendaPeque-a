"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Venta = {
  id: string;
  cantidad: number;
  total: string;
  fecha: string;
  producto: {
    nombre: string;
    categoria: {
      nombre: string;
    };
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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function SalesHistoryClient() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSales() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/ventas");
      const data = (await response.json()) as {
        ventas?: Venta[];
        data?: Venta[];
        message?: string;
      };

      const salesList = data.ventas || data.data;

      if (!response.ok || !salesList) {
        toast.error(data.message ?? "No se pudo cargar el historial.");
        return;
      }

      setVentas(salesList);
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSales();
  }, []);

  const summary = useMemo(() => {
    const today = startOfDay(new Date());
    const sevenDaysAgo = startOfDay(new Date());
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    return ventas.reduce(
      (accumulator, venta) => {
        const saleDate = new Date(venta.fecha);
        const total = Number(venta.total);

        if (saleDate >= today) {
          accumulator.today += total;
        }

        if (saleDate >= sevenDaysAgo) {
          accumulator.week += total;
        }

        return accumulator;
      },
      { today: 0, week: 0 },
    );
  }, [ventas]);

  return (
    <main className="min-h-screen px-5 py-6">
      <section className="mx-auto max-w-6xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-base font-bold uppercase tracking-wide text-emerald-700">
            Vendedor
          </p>
          <h1 className="mt-2 text-4xl font-black">Mi historial</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-700">
            Revisa tus ventas recientes y los totales vendidos hoy y esta
            semana.
          </p>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-bold text-slate-500">Vendido hoy</p>
            <p className="mt-2 text-3xl font-black">
              {formatCurrency(summary.today)}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base font-bold text-slate-500">
              Ultimos 7 dias
            </p>
            <p className="mt-2 text-3xl font-black">
              {formatCurrency(summary.week)}
            </p>
          </article>
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="p-6 text-lg font-bold text-slate-700">
              Cargando historial...
            </div>
          ) : ventas.length === 0 ? (
            <div className="p-6 text-lg font-bold text-slate-700">
              Todavia no tienes ventas registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-base font-black">Fecha</th>
                    <th className="px-4 py-3 text-base font-black">Producto</th>
                    <th className="px-4 py-3 text-base font-black">
                      Categoria
                    </th>
                    <th className="px-4 py-3 text-base font-black">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-base font-black">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((venta) => (
                    <tr className="border-t border-slate-200" key={venta.id}>
                      <td className="px-4 py-4 text-base font-bold">
                        {formatDate(venta.fecha)}
                      </td>
                      <td className="px-4 py-4 text-base">
                        {venta.producto.nombre}
                      </td>
                      <td className="px-4 py-4 text-base">
                        {venta.producto.categoria.nombre}
                      </td>
                      <td className="px-4 py-4 text-base">{venta.cantidad}</td>
                      <td className="px-4 py-4 text-base font-black">
                        {formatCurrency(venta.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
