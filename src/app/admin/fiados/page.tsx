import { prisma } from "@/infrastructure/database/prisma";
import { BookUser, Banknote, AlertTriangle } from "lucide-react";
import { redirect } from "next/navigation";
import { verifyJwtAndGetUser } from "@/infrastructure/auth/session";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function AdminFiadosPage() {
  const user = await verifyJwtAndGetUser();

  if (!user || user.rol !== "ADMIN") {
    redirect("/login");
  }

  // Obtener todos los fiados para agrupar
  const fiados = await prisma.fiado.findMany({
    orderBy: { fechaCreacion: "desc" },
    include: {
      cliente: true
    }
  });

  let totalDeudaEnLaCalle = 0;
  let totalRecaudado = 0;

  // Agrupar por cliente
  const perfiles = new Map<string, {
    nombre: string;
    telefono: string | null;
    deudaPendiente: number;
    montoTotalFiado: number;
    totalPagado: number;
    fiadosActivos: number;
  }>();

  for (const fiado of fiados) {
    const montoTotal = Number(fiado.montoTotal);
    const montoPagado = Number(fiado.montoPagado);
    const deudaPendiente = montoTotal - montoPagado;

    totalDeudaEnLaCalle += deudaPendiente;
    totalRecaudado += montoPagado;

    const clienteId = fiado.clienteId;
    if (!perfiles.has(clienteId)) {
      perfiles.set(clienteId, {
        nombre: fiado.cliente.nombre,
        telefono: fiado.cliente.telefono,
        deudaPendiente: 0,
        montoTotalFiado: 0,
        totalPagado: 0,
        fiadosActivos: 0,
      });
    }

    const perfil = perfiles.get(clienteId)!;
    perfil.montoTotalFiado += montoTotal;
    perfil.totalPagado += montoPagado;
    perfil.deudaPendiente += deudaPendiente;
    if (deudaPendiente > 0) {
      perfil.fiadosActivos += 1;
    }
  }

  const clientesDeudores = Array.from(perfiles.values())
    .filter(p => p.deudaPendiente > 0)
    .sort((a, b) => b.deudaPendiente - a.deudaPendiente);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-md">
          <BookUser size={24} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Fiados y Créditos</h1>
          <p className="text-sm font-bold text-slate-500">
            Resumen del dinero en la calle y perfiles de deudores.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-black uppercase text-slate-500">Dinero en la Calle</h3>
          </div>
          <p className="text-4xl font-black text-amber-600 tracking-tight">
            {formatCurrency(totalDeudaEnLaCalle)}
          </p>
          <p className="mt-2 text-sm font-bold text-slate-400">
            Saldo pendiente por cobrar
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-primary-100 p-2 text-primary-600">
              <Banknote size={24} />
            </div>
            <h3 className="text-sm font-black uppercase text-slate-500">Total Recaudado</h3>
          </div>
          <p className="text-4xl font-black text-primary-600 tracking-tight">
            {formatCurrency(totalRecaudado)}
          </p>
          <p className="mt-2 text-sm font-bold text-slate-400">
            Abonos recibidos a la fecha
          </p>
        </div>
      </div>

      {/* Lista de Perfiles */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-6">
          <h2 className="text-lg font-black text-slate-900">Perfiles de Deudores Activos</h2>
          <p className="text-sm text-slate-500 font-bold">Clientes que actualmente tienen saldos pendientes.</p>
        </div>
        
        {clientesDeudores.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-black">Nadie debe dinero actualmente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-black">Cliente</th>
                  <th className="px-6 py-4 font-black">Fiados Activos</th>
                  <th className="px-6 py-4 font-black">Total Fiado (Histórico)</th>
                  <th className="px-6 py-4 font-black">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientesDeudores.map((perfil) => (
                  <tr key={perfil.nombre} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-900">{perfil.nombre}</p>
                      {perfil.telefono && <p className="text-xs font-bold text-slate-500">{perfil.telefono}</p>}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs">
                        {perfil.fiadosActivos}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-500">
                      {formatCurrency(perfil.montoTotalFiado)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-amber-600 text-base">
                        {formatCurrency(perfil.deudaPendiente)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
