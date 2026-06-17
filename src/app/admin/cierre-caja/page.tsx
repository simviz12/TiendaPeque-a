import { CierreCajaClient } from "@/presentation/components/cierre-caja-client";

export const metadata = {
  title: "Cierre de Caja | Admin | Tienda Casera",
  description: "Corte de caja diario y consulta del historial de snapshots guardados.",
};

export default function AdminCierrePage() {
  return <CierreCajaClient rol="ADMIN" />;
}
