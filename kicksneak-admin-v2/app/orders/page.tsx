import { getOrders } from "./actions";
import OrdersClient from "@/components/OrdersClient";

export const revalidate = 0; // Disable cache for real-time order dashboard data

export default async function OrdersPage() {
  const initialOrders = await getOrders({ page: 1, pageSize: 8 });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestiune Comenzi Platformă</h1>
        <p className="page-subtitle">Urmărește vânzările realizate. Gestionează starea comenzilor, adaugă numere AWB și procesează rambursări.</p>
      </div>
      <OrdersClient initialOrders={initialOrders} />
    </div>
  );
}
