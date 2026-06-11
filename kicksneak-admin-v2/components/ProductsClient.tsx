"use client";

import { useState, useEffect } from "react";
import { 
  getProducts, 
  saveProduct, 
  softDeleteProduct,
  getAutocompleteOptions 
} from "@/app/products/actions";
import { Plus, Edit2, Trash2, Search, X, Loader } from "lucide-react";

interface ProductItem {
  Id: string;
  Title: string | null;
  BrandId: string | null;
  CategoryId: string | null;
  GenderId: string | null;
  FitId: string | null;
  ColorId: string | null;
  MaterialId: string | null;
  RetailPrice: number | null;
  ReleaseDate: Date | null;
  ProductUniversalId: string | null;
  ShortDescription: string | null;
  Description: string | null;
  brands: { Name: string | null } | null;
  categories: { Name: string | null } | null;
  product_photos: { PhotoUrl: string | null; IsPrimary: boolean }[];
  stock_items: { Id: string }[];
}

interface DropdownOption {
  Id: string;
  Name: string | null;
}

interface ProductsClientProps {
  initialProducts: { items: any[]; total: number };
  autocompleteData: {
    brands: DropdownOption[];
    categories: DropdownOption[];
    colors: DropdownOption[];
    materials: DropdownOption[];
    genders: DropdownOption[];
    fits: DropdownOption[];
  };
}

export default function ProductsClient({ initialProducts, autocompleteData }: ProductsClientProps) {
  // Products state
  const [products, setProducts] = useState<ProductItem[]>(initialProducts.items);
  const [total, setTotal] = useState(initialProducts.total);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductItem> | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [genderId, setGenderId] = useState("");
  const [fitId, setFitId] = useState("");
  const [colorId, setColorId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [releaseDate, setReleaseDate] = useState("");
  const [productUniversalId, setProductUniversalId] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // Simplified: one primary image URL

  // Fetch products when filters change
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const result = await getProducts({
        search,
        brandId: selectedBrand || undefined,
        categoryId: selectedCategory || undefined,
        page,
        pageSize
      });
      setProducts(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedBrand, selectedCategory, page]);

  // Handle open modal for Create
  const handleCreateOpen = () => {
    setEditingProduct(null);
    setTitle("");
    setBrandId("");
    setCategoryId("");
    setGenderId("");
    setFitId("");
    setColorId("");
    setMaterialId("");
    setRetailPrice(0);
    setReleaseDate("");
    setProductUniversalId("");
    setShortDescription("");
    setDescription("");
    setImageUrl("");
    setIsModalOpen(true);
  };

  // Handle open modal for Edit
  const handleEditOpen = (p: ProductItem) => {
    setEditingProduct(p);
    setTitle(p.Title || "");
    setBrandId(p.BrandId || "");
    setCategoryId(p.CategoryId || "");
    setGenderId(p.GenderId || "");
    setFitId(p.FitId || "");
    setColorId(p.ColorId || "");
    setMaterialId(p.MaterialId || "");
    setRetailPrice(p.RetailPrice || 0);
    setReleaseDate(p.ReleaseDate ? new Date(p.ReleaseDate).toISOString().split("T")[0] : "");
    setProductUniversalId(p.ProductUniversalId || "");
    setShortDescription(p.ShortDescription || "");
    setDescription(p.Description || "");
    
    const primaryPhoto = p.product_photos.find(ph => ph.IsPrimary) || p.product_photos[0];
    setImageUrl(primaryPhoto?.PhotoUrl || "");
    
    setIsModalOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const response = await saveProduct({
        Id: editingProduct?.Id,
        Title: title,
        BrandId: brandId || undefined,
        CategoryId: categoryId || undefined,
        GenderId: genderId || undefined,
        FitId: fitId || undefined,
        ColorId: colorId || undefined,
        MaterialId: materialId || undefined,
        RetailPrice: Number(retailPrice),
        ReleaseDate: releaseDate || undefined,
        ProductUniversalId: productUniversalId || undefined,
        ShortDescription: shortDescription || undefined,
        Description: description || undefined,
        ImageUrls: imageUrl ? [imageUrl] : [],
        PrimaryImageUrl: imageUrl || undefined
      });

      if (response.success) {
        setIsModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      console.error("Error saving product:", err);
    } finally {
      setModalLoading(false);
    }
  };

  // Soft Delete
  const handleDelete = async (id: string) => {
    if (confirm("Sigur dorești să ștergi acest produs? Ștergerea este una logică (Soft Delete).")) {
      setLoading(true);
      try {
        await softDeleteProduct(id);
        fetchProducts();
      } catch (err) {
        console.error("Error deleting product:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Search and Filters */}
      <div className="glass-card filters-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Caută după denumire, SKU..."
            className="form-control"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="dropdowns-row">
          <select 
            className="form-control select-box"
            value={selectedBrand}
            onChange={(e) => { setSelectedBrand(e.target.value); setPage(1); }}
          >
            <option value="">Toate Brandurile</option>
            {autocompleteData.brands.map((b) => (
              <option key={b.Id} value={b.Id}>{b.Name}</option>
            ))}
          </select>

          <select 
            className="form-control select-box"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          >
            <option value="">Toate Categoriile</option>
            {autocompleteData.categories.map((c) => (
              <option key={c.Id} value={c.Id}>{c.Name}</option>
            ))}
          </select>

          <button className="btn btn-primary" onClick={handleCreateOpen}>
            <Plus size={16} />
            <span>Adaugă Produs</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-card">
        {loading ? (
          <div className="table-loading">
            <Loader className="spin" size={32} />
            <span>Se încarcă datele...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="table-empty">
            <span>Nu s-a găsit niciun produs.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Denumire Sneaker</th>
                  <th>Brand</th>
                  <th>Categorie</th>
                  <th>Retail Price</th>
                  <th>SKU / Universal ID</th>
                  <th>Mărimi active</th>
                  <th style={{ textAlign: "right" }}>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const primaryPhoto = p.product_photos.find(ph => ph.IsPrimary) || p.product_photos[0];
                  return (
                    <tr key={p.Id}>
                      <td>
                        <div className="product-thumb">
                          {primaryPhoto ? (
                            <img src={primaryPhoto.PhotoUrl || ""} alt="product" />
                          ) : (
                            <div className="no-image">No Foto</div>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.Title}</td>
                      <td>{p.brands?.Name || "Nespecificat"}</td>
                      <td>{p.categories?.Name || "Nespecificat"}</td>
                      <td style={{ fontWeight: 600 }}>{p.RetailPrice ? `${p.RetailPrice} RON` : "N/A"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{p.ProductUniversalId || "—"}</td>
                      <td>
                        <span className="badge badge-info">{p.stock_items.length} oferte</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-icon" onClick={() => handleEditOpen(p)} title="Editează">
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon" onClick={() => handleDelete(p.Id)} title="Șterge" style={{ color: "var(--danger)" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="btn btn-secondary" 
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            <span className="page-indicator">Pagina {page} din {totalPages}</span>
            <button 
              className="btn btn-secondary" 
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Următor
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>{editingProduct ? "Editează Produs" : "Adaugă Produs Nou"}</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Denumire Sneaker *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">Brand</label>
                    <select 
                      className="form-control" 
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                    >
                      <option value="">Alege Brand</option>
                      {autocompleteData.brands.map(b => (
                        <option key={b.Id} value={b.Id}>{b.Name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group half">
                    <label className="form-label">Categorie</label>
                    <select 
                      className="form-control" 
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Alege Categorie</option>
                      {autocompleteData.categories.map(c => (
                        <option key={c.Id} value={c.Id}>{c.Name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">Gen (Gender)</label>
                    <select 
                      className="form-control" 
                      value={genderId}
                      onChange={(e) => setGenderId(e.target.value)}
                    >
                      <option value="">Alege Gen</option>
                      {autocompleteData.genders.map(g => (
                        <option key={g.Id} value={g.Id}>{g.Name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group half">
                    <label className="form-label">Croială (Fit)</label>
                    <select 
                      className="form-control" 
                      value={fitId}
                      onChange={(e) => setFitId(e.target.value)}
                    >
                      <option value="">Alege Croială</option>
                      {autocompleteData.fits.map(f => (
                        <option key={f.Id} value={f.Id}>{f.Name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">Culoare</label>
                    <select 
                      className="form-control" 
                      value={colorId}
                      onChange={(e) => setColorId(e.target.value)}
                    >
                      <option value="">Alege Culoare</option>
                      {autocompleteData.colors.map(col => (
                        <option key={col.Id} value={col.Id}>{col.Name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group half">
                    <label className="form-label">Material</label>
                    <select 
                      className="form-control" 
                      value={materialId}
                      onChange={(e) => setMaterialId(e.target.value)}
                    >
                      <option value="">Alege Material</option>
                      {autocompleteData.materials.map(m => (
                        <option key={m.Id} value={m.Id}>{m.Name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">Retail Price (RON) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      required 
                      min={0}
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group half">
                    <label className="form-label">Release Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">SKU / Product Universal ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: DH9792-100"
                    value={productUniversalId}
                    onChange={(e) => setProductUniversalId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Imagine Primară URL</label>
                  <input 
                    type="url" 
                    className="form-control" 
                    placeholder="https://example.com/sneaker.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Scurtă Descriere</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descriere Completă</label>
                  <textarea 
                    className="form-control" 
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Anulează
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading && <Loader className="spin" size={14} />}
                  <span>{editingProduct ? "Salvează Modificările" : "Adaugă Produs"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .filters-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 1.2rem;
        }

        .search-box {
          position: relative;
          flex: 1;
        }

        .search-icon {
          position: absolute;
          left: 0.8rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dim);
        }

        .search-box input {
          padding-left: 2.3rem;
        }

        .dropdowns-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .select-box {
          width: 180px;
          cursor: pointer;
        }

        .product-thumb {
          width: 50px;
          height: 40px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .product-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          font-size: 0.65rem;
          color: var(--text-dim);
          text-align: center;
        }

        .table-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .table-loading, .table-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 0;
          color: var(--text-muted);
          gap: 1rem;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .page-indicator {
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .half {
          flex: 1;
        }

        @media (max-width: 768px) {
          .filters-bar {
            flex-direction: column;
            align-items: stretch;
          }
          
          .dropdowns-row {
            flex-direction: column;
            align-items: stretch;
          }
          
          .select-box {
            width: 100%;
          }

          .form-row {
            flex-direction: column;
            gap: 0;
          }
        }
      `}</style>
    </div>
  );
}
