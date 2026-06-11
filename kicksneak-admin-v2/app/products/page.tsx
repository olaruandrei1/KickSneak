import { getProducts, getAutocompleteOptions } from "./actions";
import ProductsClient from "@/components/ProductsClient";

export const revalidate = 0; // Disable static page caching for real-time db values

export default async function ProductsPage() {
  const [initialProducts, autocompleteData] = await Promise.all([
    getProducts({ page: 1, pageSize: 8 }),
    getAutocompleteOptions()
  ]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestiune Catalog Sneakerși</h1>
        <p className="page-subtitle">Adaugă, editează sau șterge sneakers din catalog și sincronizează-i automat cu Elasticsearch.</p>
      </div>
      <ProductsClient 
        initialProducts={initialProducts} 
        autocompleteData={autocompleteData} 
      />
    </div>
  );
}
