import { CierreCajaClient } from "@/presentation/components/cierre-caja-client";

export const metadata = {
  title: "Cierre de Caja | Vendedor | Tienda Casera",
  description: "Corte de caja diario para vendedores de la Tienda Casera.",
};

export default function VendedorCierrePage() {
  return <CierreCajaClient rol="VENDEDOR" />;
}
