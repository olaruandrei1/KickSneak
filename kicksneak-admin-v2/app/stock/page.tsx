import { getVerificationList } from "./actions";
import StockVerificationGrid from "@/components/StockVerificationGrid";

export const revalidate = 0; // Disable caching to ensure real-time updates

export default async function StockPage() {
  const initialData = await getVerificationList({
    type: "stock",
    statusFilter: 0, // Pending Integrity Review
    page: 1,
    pageSize: 8,
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Verificare Produse & Livrări</h1>
        <p className="page-subtitle">Gestionează fluxul de autentificare fizică a produselor primite de la vânzători înainte de a genera AWB-ul de livrare finală.</p>
      </div>
      <StockVerificationGrid initialData={initialData} />
    </div>
  );
}
