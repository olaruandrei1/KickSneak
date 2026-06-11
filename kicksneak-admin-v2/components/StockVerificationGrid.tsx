"use client";

import { useState, useEffect } from "react";
import { 
  getVerificationList, 
  approveStockItem, 
  rejectStockItem, 
  approveUsedItem, 
  rejectUsedItem 
} from "@/app/stock/actions";
import { 
  Search, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  X, 
  Check, 
  Info, 
  Eye, 
  HelpCircle, 
  Package,
  Layers
} from "lucide-react";

interface VerificationItem {
  Id: string;
  ProductId: string;
  SellerId: string;
  SizeId: string;
  Price: number;
  StatusItem: number;
  RefuseReason?: string | null;
  Condition?: number; // Used items only
  CreatedAt: Date;
  products: {
    Title: string | null;
    brands: { Name: string | null } | null;
    product_photos?: { PhotoUrl: string | null }[]; // Stock items
  } | null;
  used_item_photos?: { PhotoUrl: string | null }[]; // Used items
  sellers: {
    StoreName: string | null;
    users: { FirstName: string | null; LastName: string | null } | null;
  } | null;
  sizes: { SizeLabel: string | null } | null;
}

interface StockVerificationGridProps {
  initialData: { items: any[]; total: number };
}

export default function StockVerificationGrid({ initialData }: StockVerificationGridProps) {
  const [type, setType] = useState<"stock" | "used">("stock");
  const [statusFilter, setStatusFilter] = useState<number>(0); // 0 = Pending, 1 = Verified, 3 = Rejected
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [items, setItems] = useState<VerificationItem[]>(initialData.items);
  const [total, setTotal] = useState(initialData.total);
  const [loading, setLoading] = useState(false);

  // Review Modal State
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [refuseReason, setRefuseReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState({
    isAuthentic: false,
    isCorrectSize: false,
    isCorrectCondition: false,
    isBoxOk: false,
  });

  const allChecked = checklist.isAuthentic && checklist.isCorrectSize && checklist.isCorrectCondition && checklist.isBoxOk;

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getVerificationList({
        type,
        statusFilter,
        search,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (error) {
      console.error("Failed to fetch verification list:", error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on options change
  useEffect(() => {
    fetchList();
  }, [type, statusFilter, search, page]);

  const handleTypeChange = (newType: "stock" | "used") => {
    setType(newType);
    setPage(1);
  };

  const handleStatusChange = (newStatus: number) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleOpenReview = (item: VerificationItem) => {
    setSelectedItem(item);
    setChecklist({
      isAuthentic: false,
      isCorrectSize: false,
      isCorrectCondition: false,
      isBoxOk: false,
    });
    setRefuseReason("");
    setShowRejectForm(false);
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    setSubmittingAction(true);
    try {
      if (type === "stock") {
        await approveStockItem(selectedItem.Id);
      } else {
        await approveUsedItem(selectedItem.Id);
      }
      setIsModalOpen(false);
      fetchList();
    } catch (error) {
      console.error("Approve action failed:", error);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !refuseReason.trim()) return;
    setSubmittingAction(true);
    try {
      if (type === "stock") {
        await rejectStockItem(selectedItem.Id, refuseReason);
      } else {
        await rejectUsedItem(selectedItem.Id, refuseReason);
      }
      setIsModalOpen(false);
      fetchList();
    } catch (error) {
      console.error("Reject action failed:", error);
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(val);
  };

  const getPrimaryImage = (item: VerificationItem) => {
    if (type === "stock") {
      return item.products?.product_photos?.[0]?.PhotoUrl || null;
    } else {
      return item.used_item_photos?.[0]?.PhotoUrl || null;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="verification-container">
      {/* Primary Tabs (New vs Used) */}
      <div className="tabs-container main-tabs">
        <button 
          className={`tab-btn ${type === "stock" ? "active" : ""}`} 
          onClick={() => handleTypeChange("stock")}
        >
          <Package size={16} />
          <span>Produse Noi (Stock Items)</span>
        </button>
        <button 
          className={`tab-btn ${type === "used" ? "active" : ""}`} 
          onClick={() => handleTypeChange("used")}
        >
          <Layers size={16} />
          <span>Produse Purtate (Used Items)</span>
        </button>
      </div>

      {/* Filter / Control Bar */}
      <div className="glass-card controls-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem", padding: "1.2rem" }}>
        {/* Status filters */}
        <div className="status-tabs">
          <button 
            className={`status-tab-btn ${statusFilter === 0 ? "active pending" : ""}`} 
            onClick={() => handleStatusChange(0)}
          >
            În Așteptare (Pending)
          </button>
          <button 
            className={`status-tab-btn ${statusFilter === 1 ? "active success" : ""}`} 
            onClick={() => handleStatusChange(1)}
          >
            Aprobate (Active)
          </button>
          <button 
            className={`status-tab-btn ${statusFilter === 3 ? "active danger" : ""}`} 
            onClick={() => handleStatusChange(3)}
          >
            Respinse (Rejected)
          </button>
        </div>

        {/* Search */}
        <div className="search-box" style={{ maxWidth: "350px", flex: 1, position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input 
            type="text" 
            placeholder="Caută după model sau magazin..." 
            className="form-control"
            style={{ paddingLeft: "2.3rem" }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Verification Grid Table */}
      <div className="glass-card table-section">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="spin" size={36} />
            <span>Se încarcă lista de verificare...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <Info size={32} style={{ color: "var(--text-dim)" }} />
            <span>Nu s-a găsit niciun produs pentru criteriile selectate.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produs / Sneaker</th>
                  <th>Brand</th>
                  <th>Vânzător</th>
                  <th>Preț</th>
                  <th>Mărime</th>
                  <th>Condiție</th>
                  <th>Dată Depunere</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Revizuire</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const image = getPrimaryImage(item);
                  const sellerName = item.sellers?.StoreName || 
                    (item.sellers?.users ? `${item.sellers.users.FirstName || ""} ${item.sellers.users.LastName || ""}`.trim() : null) || 
                    "Vânzător KickSneak";
                  
                  return (
                    <tr key={item.Id}>
                      <td style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 600 }}>
                        <div className="product-thumb">
                          {image ? (
                            <img src={image} alt={item.products?.Title || "Sneaker"} />
                          ) : (
                            <HelpCircle size={20} className="placeholder-icon" />
                          )}
                        </div>
                        <span className="product-title-text">{item.products?.Title || "Adidași"}</span>
                      </td>
                      <td>{item.products?.brands?.Name || "—"}</td>
                      <td>{sellerName}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(item.Price)}</td>
                      <td>
                        <span className="badge badge-info" style={{ borderRadius: "4px" }}>
                          {item.sizes?.SizeLabel || "OS"}
                        </span>
                      </td>
                      <td>
                        {type === "stock" ? (
                          <span className="condition-tag new">10/10 (Nou)</span>
                        ) : (
                          <span className="condition-tag used">{item.Condition || 8}/10 (Purtat)</span>
                        )}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(item.CreatedAt).toLocaleDateString("ro-RO")}
                      </td>
                      <td>
                        {item.StatusItem === 0 ? (
                          <span className="badge badge-warning">În Așteptare</span>
                        ) : item.StatusItem === 1 ? (
                          <span className="badge badge-success">Verificat / Activ</span>
                        ) : (
                          <span className="badge badge-danger" title={item.RefuseReason || "Fără motiv specificat"}>Respins</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: "0.3rem 0.75rem", fontSize: "0.85rem" }}
                          onClick={() => handleOpenReview(item)}
                        >
                          <Eye size={14} />
                          <span>{statusFilter === 0 ? "Autentifică" : "Vezi detalii"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
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

      {/* Review Modal Dialog */}
      {isModalOpen && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h3>
                {statusFilter === 0 ? "Autentificare și Evaluare Integritate" : "Detalii Evaluare Produs"}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body verification-modal-body">
              <div className="verification-layout">
                {/* Visual verification preview */}
                <div className="visual-preview">
                  <div className="large-preview-box">
                    {getPrimaryImage(selectedItem) ? (
                      <img src={getPrimaryImage(selectedItem)!} alt={selectedItem.products?.Title || ""} />
                    ) : (
                      <div className="no-photo-box">
                        <HelpCircle size={48} />
                        <span>Fără fotografii depuse</span>
                      </div>
                    )}
                  </div>
                  <div className="product-quick-info">
                    <h4>{selectedItem.products?.Title}</h4>
                    <span className="brand-label">{selectedItem.products?.brands?.Name || "Sneakers"}</span>
                    <div className="details-grid">
                      <div>
                        <span className="lbl">Preț Cerut:</span>
                        <span className="val highlight">{formatCurrency(selectedItem.Price)}</span>
                      </div>
                      <div>
                        <span className="lbl">Mărime:</span>
                        <span className="val">{selectedItem.sizes?.SizeLabel}</span>
                      </div>
                      <div>
                        <span className="lbl">Vânzător:</span>
                        <span className="val">{selectedItem.sellers?.StoreName || "Membru"}</span>
                      </div>
                      <div>
                        <span className="lbl">Tip Stoc:</span>
                        <span className="val">{type === "stock" ? "Produs Nou" : `Purtat (Condiție: ${selectedItem.Condition}/10)`}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification checklist and actions */}
                <div className="check-actions-section">
                  {statusFilter === 0 ? (
                    <>
                      <h4 className="section-title">Checklist Integritate (Fizic)</h4>
                      <p className="section-subtitle">Fiecare element trebuie inspectat și bifat de expertul KickSneak înainte de aprobare.</p>
                      
                      <div className="checklist-container">
                        <label className={`checklist-item ${checklist.isAuthentic ? "checked" : ""}`}>
                          <input 
                            type="checkbox"
                            checked={checklist.isAuthentic}
                            onChange={(e) => setChecklist(prev => ({ ...prev, isAuthentic: e.target.checked }))}
                          />
                          <span className="box-indicator"></span>
                          <span className="text">Produsul este ORIGINAL (autenticitate confirmată)</span>
                        </label>

                        <label className={`checklist-item ${checklist.isCorrectSize ? "checked" : ""}`}>
                          <input 
                            type="checkbox"
                            checked={checklist.isCorrectSize}
                            onChange={(e) => setChecklist(prev => ({ ...prev, isCorrectSize: e.target.checked }))}
                          />
                          <span className="box-indicator"></span>
                          <span className="text">Mărimea pe etichetă corespunde cu {selectedItem.sizes?.SizeLabel}</span>
                        </label>

                        <label className={`checklist-item ${checklist.isCorrectCondition ? "checked" : ""}`}>
                          <input 
                            type="checkbox"
                            checked={checklist.isCorrectCondition}
                            onChange={(e) => setChecklist(prev => ({ ...prev, isCorrectCondition: e.target.checked }))}
                          />
                          <span className="box-indicator"></span>
                          <span className="text">Condiția fizică corespunde cu descrierea ({type === "stock" ? "Nou / Niciodată purtat" : `Purtat ${selectedItem.Condition}/10`})</span>
                        </label>

                        <label className={`checklist-item ${checklist.isBoxOk ? "checked" : ""}`}>
                          <input 
                            type="checkbox"
                            checked={checklist.isBoxOk}
                            onChange={(e) => setChecklist(prev => ({ ...prev, isBoxOk: e.target.checked }))}
                          />
                          <span className="box-indicator"></span>
                          <span className="text">Ambalajul (cutia) este original și în stare bună</span>
                        </label>
                      </div>

                      {showRejectForm ? (
                        <form onSubmit={handleReject} className="reject-form-area">
                          <div className="form-group">
                            <label className="form-label text-orange">Motivul respingerii produsului *</label>
                            <textarea
                              className="form-control"
                              required
                              rows={3}
                              placeholder="Introduceți motivul clar al respingerii (Ex: Produsul prezintă semne de uzură suplimentare / Talpa este dezlipită / Modelul este replică)."
                              value={refuseReason}
                              onChange={(e) => setRefuseReason(e.target.value)}
                            />
                          </div>
                          <div className="reject-buttons">
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              onClick={() => { setShowRejectForm(false); setRefuseReason(""); }}
                            >
                              Revino la aprobare
                            </button>
                            <button 
                              type="submit" 
                              className="btn btn-danger" 
                              disabled={submittingAction || !refuseReason.trim()}
                            >
                              {submittingAction ? <Loader2 className="spin" size={14} /> : <X size={14} />}
                              <span>Confirmă Respingerea</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="action-buttons-box">
                          <button
                            type="button"
                            className="btn btn-danger btn-action-half"
                            onClick={() => setShowRejectForm(true)}
                          >
                            <X size={16} />
                            <span>Respinge Produsul</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-action-half btn-approve"
                            disabled={!allChecked || submittingAction}
                            onClick={handleApprove}
                          >
                            {submittingAction ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
                            <span>Aprobă & Activează</span>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="verified-status-display">
                      {selectedItem.StatusItem === 1 ? (
                        <div className="status-badge-big success">
                          <ShieldCheck size={36} />
                          <h4>Produs Verificat & Activ</h4>
                          <p>Acest produs a trecut cu succes inspecția fizică și este listat pe site.</p>
                        </div>
                      ) : (
                        <div className="status-badge-big danger">
                          <AlertTriangle size={36} />
                          <h4>Produs Respins</h4>
                          <p>Inspecția fizică a eșuat.</p>
                          <div className="reason-container">
                            <strong>Motivul respingerii:</strong>
                            <p className="reason-text">{selectedItem.RefuseReason || "Nu a fost specificat un motiv în baza de date."}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .verification-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .main-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .status-tabs {
          display: flex;
          gap: 0.5rem;
        }

        .status-tab-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          font-family: inherit;
          font-size: 0.88rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .status-tab-btn:hover {
          background: rgba(255, 255, 255, 0.07);
          color: var(--text-main);
        }

        .status-tab-btn.active {
          color: #fff;
          font-weight: 600;
        }

        .status-tab-btn.active.pending {
          background: rgba(245, 158, 11, 0.25);
          border-color: var(--warning);
        }

        .status-tab-btn.active.success {
          background: rgba(16, 185, 129, 0.25);
          border-color: var(--success);
        }

        .status-tab-btn.active.danger {
          background: rgba(239, 68, 68, 0.25);
          border-color: var(--danger);
        }

        /* Product Thumbnails */
        .product-thumb {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .product-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-icon {
          color: var(--text-dim);
        }

        .product-title-text {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Condition Tags */
        .condition-tag {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }

        .condition-tag.new {
          background: rgba(0, 240, 255, 0.1);
          color: var(--secondary-color);
          border: 1px solid rgba(0, 240, 255, 0.2);
        }

        .condition-tag.used {
          background: rgba(112, 0, 255, 0.1);
          color: #a855f7;
          border: 1px solid rgba(112, 0, 255, 0.2);
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 0;
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

        /* Modal layout */
        .verification-modal-body {
          padding: 1.5rem;
        }

        .verification-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .verification-layout {
            grid-template-columns: 1fr;
          }
        }

        .visual-preview {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .large-preview-box {
          aspect-ratio: 4/3;
          background: rgba(0,0,0,0.4);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .large-preview-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .no-photo-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--text-dim);
          gap: 0.5rem;
          font-size: 0.85rem;
        }

        .product-quick-info h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.2rem;
        }

        .brand-label {
          font-size: 0.85rem;
          color: var(--primary-color);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-top: 1rem;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 0.85rem;
        }

        .details-grid .lbl {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .details-grid .val {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .details-grid .val.highlight {
          color: var(--secondary-color);
        }

        /* Checklist */
        .check-actions-section {
          display: flex;
          flex-direction: column;
        }

        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.25rem;
        }

        .section-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 1.25rem;
          line-height: 1.4;
        }

        .checklist-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
          user-select: none;
        }

        .checklist-item:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--border-hover);
        }

        .checklist-item.checked {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.25);
        }

        .checklist-item input {
          display: none;
        }

        .box-indicator {
          width: 18px;
          height: 18px;
          border: 2px solid var(--text-dim);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .checklist-item input:checked + .box-indicator {
          border-color: var(--success);
          background: var(--success);
        }

        .checklist-item input:checked + .box-indicator:after {
          content: "✓";
          color: #fff;
          font-weight: 700;
          font-size: 0.72rem;
        }

        .checklist-item .text {
          font-size: 0.88rem;
          color: var(--text-muted);
          transition: color var(--transition-fast);
        }

        .checklist-item.checked .text {
          color: #fff;
          font-weight: 500;
        }

        /* Actions buttons */
        .action-buttons-box {
          display: flex;
          gap: 1rem;
          margin-top: auto;
        }

        .btn-action-half {
          flex: 1;
          padding: 0.75rem;
        }

        .btn-approve {
          background: var(--success);
        }

        .btn-approve:hover:not(:disabled) {
          background: #059669;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
        }

        .btn-approve:disabled {
          background: rgba(16, 185, 129, 0.2);
          color: rgba(255,255,255,0.3);
          border-color: transparent;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Reject form */
        .reject-form-area {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          animation: slideUp 0.25s ease;
        }

        .reject-buttons {
          display: flex;
          gap: 1rem;
        }

        .reject-buttons button {
          flex: 1;
        }

        .text-orange {
          color: var(--warning);
        }

        /* Big status display for verified/rejected */
        .verified-status-display {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 250px;
        }

        .status-badge-big {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.75rem;
          padding: 1.5rem;
          border-radius: var(--radius-md);
          width: 100%;
        }

        .status-badge-big.success {
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.15);
          color: var(--success);
        }

        .status-badge-big.success p {
          color: var(--text-muted);
          font-size: 0.88rem;
          max-width: 280px;
          line-height: 1.4;
        }

        .status-badge-big.danger {
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: var(--danger);
        }

        .status-badge-big.danger p {
          color: var(--text-muted);
          font-size: 0.88rem;
          line-height: 1.4;
        }

        .reason-container {
          margin-top: 0.75rem;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          width: 100%;
          text-align: left;
        }

        .reason-container strong {
          font-size: 0.8rem;
          color: var(--text-main);
        }

        .reason-text {
          margin-top: 0.25rem;
          color: #fca5a5 !important;
          font-size: 0.85rem !important;
          line-height: 1.4;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
