"use client";

import { useState } from "react";
import {
  getCatalogData,
  saveBrand, deleteBrand,
  saveCategory, deleteCategory,
  saveColor, deleteColor,
  saveMaterial, deleteMaterial,
  saveFit, deleteFit,
  saveGender, deleteGender,
  saveSize, deleteSize
} from "@/app/catalog/actions";
import { Plus, Edit2, Trash2, X, Loader } from "lucide-react";

interface Nomenclature {
  Id: string;
  Name?: string | null;
  ParentId?: string | null;
  SizeLabel?: string | null;
  SizeUs?: string | null;
  SizeEu?: string | null;
  SizeUk?: string | null;
  SizeCm?: number | null;
  SizeTypeId?: string;
  size_types?: { Name: string | null } | null;
}

interface CatalogData {
  brands: any[];
  categories: any[];
  colors: any[];
  materials: any[];
  sizes: any[];
  sizeTypes: any[];
  fits: any[];
  genders: any[];
}

export default function CatalogClient({ initialData }: { initialData: CatalogData }) {
  const [data, setData] = useState<CatalogData>(initialData);
  const [activeTab, setActiveTab] = useState<"brands" | "categories" | "colors" | "materials" | "sizes" | "fits" | "genders">("brands");
  const [loading, setLoading] = useState(false);

  // Modal Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Nomenclature | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  // Size Form states
  const [sizeTypeId, setSizeTypeId] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [sizeUs, setSizeUs] = useState("");
  const [sizeEu, setSizeEu] = useState("");
  const [sizeUk, setSizeUk] = useState("");
  const [sizeCm, setSizeCm] = useState<number | "">("");

  const refreshData = async () => {
    setLoading(true);
    try {
      const result = await getCatalogData();
      setData(result);
    } catch (err) {
      console.error("Failed to refresh catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName("");
    setParentId("");
    if (data.sizeTypes.length > 0) {
      setSizeTypeId(data.sizeTypes[0].Id);
    }
    setSizeLabel("");
    setSizeUs("");
    setSizeEu("");
    setSizeUk("");
    setSizeCm("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Nomenclature) => {
    setEditingItem(item);
    setName(item.Name || "");
    setParentId(item.ParentId || "");
    setSizeTypeId(item.SizeTypeId || "");
    setSizeLabel(item.SizeLabel || "");
    setSizeUs(item.SizeUs || "");
    setSizeEu(item.SizeEu || "");
    setSizeUk(item.SizeUk || "");
    setSizeCm(item.SizeCm || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      if (activeTab === "brands") {
        await saveBrand(editingItem?.Id, name, parentId);
      } else if (activeTab === "categories") {
        await saveCategory(editingItem?.Id, name, parentId);
      } else if (activeTab === "colors") {
        await saveColor(editingItem?.Id, name);
      } else if (activeTab === "materials") {
        await saveMaterial(editingItem?.Id, name);
      } else if (activeTab === "fits") {
        await saveFit(editingItem?.Id, name);
      } else if (activeTab === "genders") {
        await saveGender(editingItem?.Id, name);
      } else if (activeTab === "sizes") {
        await saveSize({
          id: editingItem?.Id,
          sizeTypeId,
          label: sizeLabel,
          us: sizeUs,
          eu: sizeEu,
          uk: sizeUk,
          cm: sizeCm ? Number(sizeCm) : undefined
        });
      }
      setIsModalOpen(false);
      await refreshData();
    } catch (err) {
      console.error("Failed to save nomenclature:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Sigur dorești să ștergi acest element? Ștergerea este una logică.")) {
      setLoading(true);
      try {
        if (activeTab === "brands") await deleteBrand(id);
        else if (activeTab === "categories") await deleteCategory(id);
        else if (activeTab === "colors") await deleteColor(id);
        else if (activeTab === "materials") await deleteMaterial(id);
        else if (activeTab === "fits") await deleteFit(id);
        else if (activeTab === "genders") await deleteGender(id);
        else if (activeTab === "sizes") await deleteSize(id);
        await refreshData();
      } catch (err) {
        console.error("Failed to delete nomenclature:", err);
        setLoading(false);
      }
    }
  };

  // Helper: get item parent name
  const getParentName = (parentId: string | null) => {
    if (!parentId) return "—";
    if (activeTab === "brands") {
      return data.brands.find(b => b.Id === parentId)?.Name || "—";
    } else if (activeTab === "categories") {
      return data.categories.find(c => c.Id === parentId)?.Name || "—";
    }
    return "—";
  };

  const getActiveList = () => {
    return data[activeTab] || [];
  };

  const itemsList = getActiveList();

  return (
    <div>
      {/* Sub tabs */}
      <div className="tabs-container" style={{ marginBottom: "2rem" }}>
        <button className={`tab-btn ${activeTab === "brands" ? "active" : ""}`} onClick={() => setActiveTab("brands")}>Brands</button>
        <button className={`tab-btn ${activeTab === "categories" ? "active" : ""}`} onClick={() => setActiveTab("categories")}>Categorii</button>
        <button className={`tab-btn ${activeTab === "colors" ? "active" : ""}`} onClick={() => setActiveTab("colors")}>Culori</button>
        <button className={`tab-btn ${activeTab === "materials" ? "active" : ""}`} onClick={() => setActiveTab("materials")}>Materiale</button>
        <button className={`tab-btn ${activeTab === "sizes" ? "active" : ""}`} onClick={() => setActiveTab("sizes")}>Dimensiuni / Mărimi</button>
        <button className={`tab-btn ${activeTab === "fits" ? "active" : ""}`} onClick={() => setActiveTab("fits")}>Fits</button>
        <button className={`tab-btn ${activeTab === "genders" ? "active" : ""}`} onClick={() => setActiveTab("genders")}>Genders</button>
      </div>

      {/* Control bar */}
      <div className="glass-card catalog-control" style={{ marginBottom: "1.5rem", padding: "1.2rem" }}>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>Adaugă {activeTab === "sizes" ? "Mărime" : "Element"}</span>
        </button>
        {loading && (
          <div className="status-loading">
            <Loader className="spin" size={16} />
            <span>Sincronizare...</span>
          </div>
        )}
      </div>

      {/* Grid listing */}
      <div className="glass-card">
        {loading && itemsList.length === 0 ? (
          <div className="table-loading">
            <Loader className="spin" size={32} />
            <span>Se încarcă nomenclatorul...</span>
          </div>
        ) : itemsList.length === 0 ? (
          <div className="table-empty">
            <span>Nu există elemente definite.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                {activeTab === "sizes" ? (
                  <tr>
                    <th>Grup Mărime</th>
                    <th>Etichetă Label</th>
                    <th>Size US</th>
                    <th>Size EU</th>
                    <th>Size UK</th>
                    <th>Mărime CM</th>
                    <th style={{ textAlign: "right" }}>Acțiuni</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Denumire</th>
                    {["brands", "categories"].includes(activeTab) && <th>Părinte Ierarhie</th>}
                    <th>ID Element</th>
                    <th style={{ textAlign: "right" }}>Acțiuni</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {itemsList.map((item) => (
                  <tr key={item.Id}>
                    {activeTab === "sizes" ? (
                      <>
                        <td style={{ fontWeight: 600 }}>{item.size_types?.Name || "—"}</td>
                        <td>{item.SizeLabel}</td>
                        <td>{item.SizeUs || "—"}</td>
                        <td style={{ fontWeight: 700 }}>{item.SizeEu || "—"}</td>
                        <td>{item.SizeUk || "—"}</td>
                        <td>{item.SizeCm ? `${item.SizeCm} cm` : "—"}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{item.Name}</td>
                        {["brands", "categories"].includes(activeTab) && (
                          <td>{getParentName(item.ParentId)}</td>
                        )}
                        <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text-dim)" }}>
                          {item.Id}
                        </td>
                      </>
                    )}
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon" onClick={() => handleOpenEdit(item)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon" onClick={() => handleDelete(item.Id)} style={{ color: "var(--danger)" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3>{editingItem ? "Editează element" : "Adaugă element"}</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {activeTab === "sizes" ? (
                  /* Size Form fields */
                  <>
                    <div className="form-group">
                      <label className="form-label">Grup Mărime (Size Type) *</label>
                      <select 
                        className="form-control"
                        required
                        value={sizeTypeId}
                        onChange={(e) => setSizeTypeId(e.target.value)}
                      >
                        {data.sizeTypes.map(st => (
                          <option key={st.Id} value={st.Id}>{st.Name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Etichetă Label * (Ex: 42, M, OS)</label>
                      <input 
                        type="text" 
                        className="form-control"
                        required
                        value={sizeLabel}
                        onChange={(e) => setSizeLabel(e.target.value)}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group half">
                        <label className="form-label">EU Size</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={sizeEu}
                          onChange={(e) => setSizeEu(e.target.value)}
                        />
                      </div>
                      <div className="form-group half">
                        <label className="form-label">US Size</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={sizeUs}
                          onChange={(e) => setSizeUs(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group half">
                        <label className="form-label">UK Size</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={sizeUk}
                          onChange={(e) => setSizeUk(e.target.value)}
                        />
                      </div>
                      <div className="form-group half">
                        <label className="form-label">Mărime în CM</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="form-control"
                          value={sizeCm}
                          onChange={(e) => setSizeCm(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* Standard nomenclature form fields (Name, Parent) */
                  <>
                    <div className="form-group">
                      <label className="form-label">Denumire *</label>
                      <input 
                        type="text" 
                        className="form-control"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    {["brands", "categories"].includes(activeTab) && (
                      <div className="form-group">
                        <label className="form-label">Părinte (Ierarhie)</label>
                        <select 
                          className="form-control"
                          value={parentId}
                          onChange={(e) => setParentId(e.target.value)}
                        >
                          <option value="">Niciun părinte (Principal)</option>
                          {activeTab === "brands" 
                            ? data.brands
                                .filter(b => b.Id !== editingItem?.Id)
                                .map(b => <option key={b.Id} value={b.Id}>{b.Name}</option>)
                            : data.categories
                                .filter(c => c.Id !== editingItem?.Id)
                                .map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)
                          }
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Anulează
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading && <Loader className="spin" size={14} />}
                  <span>{editingItem ? "Salvează" : "Adaugă"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .catalog-control {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .status-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary-color);
          font-size: 0.85rem;
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

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .half {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
