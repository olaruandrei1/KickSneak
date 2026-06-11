import { getSellers } from "./actions";
import SellersClient from "@/components/SellersClient";

export const revalidate = 0; // Disable cache for real-time seller dashboard data

export default async function SellersPage() {
  const initialSellers = await getSellers({ page: 1, pageSize: 8 });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Administrare Vânzători</h1>
        <p className="page-subtitle">Modifică scorurile de încredere (Trust Score) ale magazinelor partenere și blochează sau suspendă magazinele care încalcă regulamentul.</p>
      </div>
      <SellersClient initialSellers={initialSellers} />
    </div>
  );
}
