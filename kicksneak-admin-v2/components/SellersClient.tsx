"use client";

import { useState, useEffect } from "react";
import { 
  getSellers, 
  updateTrustScore, 
  toggleSellerBlock, 
  toggleSellerSuspended 
} from "@/app/sellers/actions";
import { Search, Loader, ShieldAlert, Star, X, Check } from "lucide-react";
import AlertModal from "./AlertModal";

interface SellerItem {
  Id: string;
  UserId: string;
  StoreName: string | null;
  Phone: string | null;
  City: string | null;
  SellType: string | null;
  ProductType: string | null;
  HasCompany: boolean;
  CompanyName: string | null;
  VatNumber: string | null;
  TrustScore: number | null;
  IsBlocked: boolean;
  IsSuspended: boolean;
  Reason: string | null;
  CreatedAt: Date;
  users: {
    FirstName: string | null;
    LastName: string | null;
    FirebaseUid: string | null;
  } | null;
  _count: {
    stock_items: number;
    used_items: number;
  };
}

interface SellersClientProps {
  initialSellers: { items: any[]; total: number };
}

export default function SellersClient({ initialSellers }: SellersClientProps) {
  const [sellers, setSellers] = useState<SellerItem[]>(initialSellers.items);
  const [total, setTotal] = useState(initialSellers.total);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "info" as "info"|"success"|"error"|"warning" });
  const [search, setSearch] = useState("");

  const showAlert = (message: string, type: "info"|"success"|"error"|"warning" = "info", title?: string) => {
    setModalState({ isOpen: true, message, type, title: title || "" });
  };
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Inline TrustScore editing state
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [tempScore, setTempScore] = useState<number>(100);

  // Block/Suspend Modal state
  const [actionType, setActionType] = useState<"block" | "suspend" | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<SellerItem | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const result = await getSellers({
        search,
        page,
        pageSize
      });
      setSellers(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error("Error fetching sellers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, [search, page]);

  // Adjust trust score
  const handleScoreEditStart = (s: SellerItem) => {
    setEditingScoreId(s.Id);
    setTempScore(s.TrustScore || 100);
  };

  const handleScoreSave = async (sellerId: string) => {
    if (tempScore < 0 || tempScore > 100) {
      showAlert("Scorul trebuie să fie între 0 și 100!", "warning");
      return;
    }
    setLoading(true);
    try {
      await updateTrustScore(sellerId, tempScore);
      setEditingScoreId(null);
      fetchSellers();
    } catch (err) {
      console.error("Failed to update trust score:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open block/suspend modal
  const handleOpenActionModal = (type: "block" | "suspend", s: SellerItem) => {
    setActionType(type);
    setSelectedSeller(s);
    setReasonText(s.Reason || "");
    setIsModalOpen(true);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Submit block/suspend status
  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller || !actionType) return;
    setModalLoading(true);
    try {
      if (actionType === "block") {
        const currentVal = selectedSeller.IsBlocked;
        await toggleSellerBlock(selectedSeller.Id, !currentVal, !currentVal ? reasonText : undefined);
      } else {
        const currentVal = selectedSeller.IsSuspended;
        await toggleSellerSuspended(selectedSeller.Id, !currentVal, !currentVal ? reasonText : undefined);
      }
      setIsModalOpen(false);
      fetchSellers();
    } catch (err) {
      console.error("Failed action on seller:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Search Bar */}
      <div className="glass-card filters-bar" style={{ marginBottom: "2rem", padding: "1.2rem" }}>
        <div className="search-box" style={{ maxWidth: "450px" }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Caută după denumire magazin, oraș..."
            className="form-control"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Sellers table */}
      <div className="glass-card">
        {loading ? (
          <div className="table-loading">
            <Loader className="spin" size={32} />
            <span>Se încarcă lista de vânzători...</span>
          </div>
        ) : sellers.length === 0 ? (
          <div className="table-empty">
            <span>Nu s-a găsit niciun vânzător.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Denumire Magazin</th>
                  <th>Proprietar</th>
                  <th>Oraș</th>
                  <th>Telefon</th>
                  <th>Firma (CUI)</th>
                  <th>Listings active</th>
                  <th>Trust Score</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Modificări Status</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => {
                  const totalListings = s._count.stock_items + s._count.used_items;
                  const isEditingScore = editingScoreId === s.Id;
                  return (
                    <tr key={s.Id}>
                      <td style={{ fontWeight: 600 }}>{s.StoreName || "Magazin Partener (Nespecificat)"}</td>
                      <td>
                        {s.users ? `${s.users.FirstName || ""} ${s.users.LastName || ""}`.trim() || s.users.FirebaseUid : "Fără proprietar"}
                      </td>
                      <td>{s.City || "—"}</td>
                      <td>{s.Phone || "—"}</td>
                      <td style={{ fontSize: "0.85rem" }}>
                        {s.HasCompany ? `${s.CompanyName} (${s.VatNumber})` : "Persoană Fizică"}
                      </td>
                      <td>
                        <span className="badge badge-info">{totalListings} produse</span>
                      </td>
                      <td>
                        {isEditingScore ? (
                          <div className="score-edit-box">
                            <input 
                              type="number" 
                              className="form-control score-input"
                              min={0}
                              max={100}
                              value={tempScore}
                              onChange={(e) => setTempScore(Number(e.target.value))}
                            />
                            <button className="btn-icon" onClick={() => handleScoreSave(s.Id)} style={{ color: "var(--success)" }}>
                              <Check size={12} />
                            </button>
                            <button className="btn-icon" onClick={() => setEditingScoreId(null)} style={{ color: "var(--danger)" }}>
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="score-display-box" onClick={() => handleScoreEditStart(s)} title="Click pentru modificare">
                            <span className="badge badge-success" style={{ fontWeight: 700, cursor: "pointer" }}>
                              {s.TrustScore || 100}
                            </span>
                            <span className="score-edit-hint">Modifică</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {s.IsBlocked ? (
                          <span className="badge badge-danger" title={s.Reason || ""}>Blocat</span>
                        ) : s.IsSuspended ? (
                          <span className="badge badge-warning" title={s.Reason || ""}>Suspendat</span>
                        ) : (
                          <span className="badge badge-success">Activ</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", color: s.IsSuspended ? "var(--success)" : "var(--warning)" }}
                            onClick={() => handleOpenActionModal("suspend", s)}
                          >
                            {s.IsSuspended ? "Unsuspend" : "Suspend"}
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                            onClick={() => handleOpenActionModal("block", s)}
                          >
                            {s.IsBlocked ? "Unblock" : "Block"}
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

        {/* Pagination */}
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

      {/* Block/Suspend Dialog Reason */}
      {isModalOpen && selectedSeller && actionType && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3>
                {actionType === "block" 
                  ? (selectedSeller.IsBlocked ? "Deblocare Magazin" : "Blocare Permanentă") 
                  : (selectedSeller.IsSuspended ? "Anulare Suspendare" : "Suspendare Temporară")
                }
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitAction}>
              <div className="modal-body">
                {/* Check whether we are turning on or off */}
                {((actionType === "block" && !selectedSeller.IsBlocked) || (actionType === "suspend" && !selectedSeller.IsSuspended)) ? (
                  <div className="form-group">
                    <label className="form-label">Motivul acțiunii pentru magazinul "{selectedSeller.StoreName}":</label>
                    <textarea 
                      className="form-control" 
                      rows={4}
                      required
                      placeholder="Ex: Încălcări repetate ale regulamentului privind originalitatea produselor."
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                    />
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                    Ești sigur că dorești să reactivezi magazinul <strong>"{selectedSeller.StoreName}"</strong>? 
                    Acesta va primi din nou dreptul de a depune stocuri.
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Anulează
                </button>
                <button type="submit" className="btn className btn-primary" disabled={modalLoading}>
                  {modalLoading && <Loader className="spin" size={14} />}
                  <span>Confirmă</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))} 
        title={modalState.title} 
        message={modalState.message} 
        type={modalState.type} 
      />

      <style jsx>{`
        .filters-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
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

        .table-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .score-edit-box {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .score-input {
          width: 55px;
          padding: 0.2rem 0.3rem;
          text-align: center;
          font-size: 0.85rem;
        }

        .score-display-box {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .score-edit-hint {
          font-size: 0.72rem;
          color: var(--text-dim);
          opacity: 0;
          transition: opacity var(--transition-fast);
          cursor: pointer;
        }

        .score-display-box:hover .score-edit-hint {
          opacity: 1;
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
      `}</style>
    </div>
  );
}
