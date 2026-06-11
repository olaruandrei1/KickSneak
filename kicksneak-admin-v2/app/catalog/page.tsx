import { getCatalogData } from "./actions";
import CatalogClient from "@/components/CatalogClient";

export const revalidate = 0; // Disable cache for real-time catalog dashboard data

export default async function CatalogPage() {
  const catalogData = await getCatalogData();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Configurare Catalog Nomenclatoare</h1>
        <p className="page-subtitle">Administrează valorile globale folosite în magazin: branduri, categorii, culori, materiale, mărimi și caracteristici.</p>
      </div>
      <CatalogClient initialData={catalogData} />
    </div>
  );
}
