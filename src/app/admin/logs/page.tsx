import { LogsClient } from "./logs-client";

export const metadata = {
  title: "Logs de Auditoría | Admin | Tienda Casera",
  description: "Registro de todas las acciones del sistema, filtrable por usuario y fecha.",
};

export default function AdminLogsPage() {
  return <LogsClient />;
}
