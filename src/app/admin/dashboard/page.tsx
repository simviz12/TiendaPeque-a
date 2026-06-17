import dynamic from "next/dynamic";

const DashboardClient = dynamic(
  () => import("./dashboard-client").then((mod) => mod.DashboardClient),
  { ssr: false }
);

export const metadata = {
  title: "Dashboard de Administración | Tienda Casera",
  description: "Panel de control general con estadísticas de ventas, salud del negocio e inventario.",
};

export default function AdminDashboardPage() {
  return <DashboardClient />;
}
