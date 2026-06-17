import { SalesAdminClient } from "./sales-admin-client";

export const metadata = {
  title: "Historial de Ventas | Tienda Casera",
  description: "Revisa todas las ventas realizadas, filtra por vendedor y busca productos.",
};

export default function AdminSalesPage() {
  return <SalesAdminClient />;
}
