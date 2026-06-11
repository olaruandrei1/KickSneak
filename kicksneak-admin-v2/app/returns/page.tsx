import { getReturns } from "./actions";
import ReturnsClient from "@/components/ReturnsClient";

export const revalidate = 0; // Disable cache for real-time returns dashboard data

export default async function ReturnsPage() {
  const initialReturns = await getReturns({ page: 1, pageSize: 8 });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Management Cereri Retur</h1>
        <p className="page-subtitle">Procesează solicitările de retur înregistrate de cumpărători. Aprobarea marchează automat comanda ca returnată.</p>
      </div>
      <ReturnsClient initialReturns={initialReturns} />
    </div>
  );
}
