"use client";

import { useState, useEffect } from "react";
import { getReturns, processReturn } from "@/app/returns/actions";
import { Check, X, Loader, Search, RotateCcw } from "lucide-react";

interface ReturnItem {
  Id: string;
  OrderId: string;
  UserId: string;
  Reason: string | null;
  Description: string | null;
  Status: number; // 0=Pending, 1=Approved, 2=Rejected
  CreatedAt: Date;
  users: { FirstName: string | null; LastName: string | null } | null;
  orders: {
    TotalPrice: number;
    stock_items: { products: { Title: string | null } | null } | null;
    used_items: { products: { Title: string | null } | null } | null;
  } | null;
}

interface ReturnsClientProps {
  initialReturns: { items: any[]; total: number };
}

const statusMap: { [key: number]: { label: string; class: string } } = {
  0: { label: "În așteptare", class: "badge-warning" },
  1: { label: "Aprobat", class: "badge-success" },
  2: { label: "Respins", class: "badge-danger" },
};

export default function ReturnsClient({ initialReturns }: ReturnsClientProps) {
  const [items, setItems] = useState<ReturnItem[]>(initialReturns.items);
  const [total, setTotal] = useState(initialReturns.total);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Rejection Dialog State
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingReturnId, setPendingReturnId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const result = await getReturns({ page, pageSize });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error("Error fetching returns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [page]);

  const handleApprove = async (id: string) => {
    if (confirm("Sigur dorești să aprobi această cerere de retur? Aceasta va returna banii cumpărătorului și va marca comanda ca returnată.")) {
      setLoading(true);
      try {
        await processReturn(id, 1);
        fetchReturns();
      } catch (err) {
        console.error("Failed to approve return:", err);
        setLoading(false);
      }
    }
  };

  const handleRejectOpen = (id: string) => {
    setPendingReturnId(id);
    setRejectReason("");
    setIsRejectOpen(true);
  };

  const submitRejection = async () => {
    if (!pendingReturnId || !rejectReason.trim()) return;
    setModalLoading(true);
    try {
      await processReturn(pendingReturnId, 2, rejectReason);
      setIsRejectOpen(false);
      setPendingReturnId(null);
      fetchReturns();
    } catch (err) {
      console.error("Failed to reject return:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const formatCurrency = (val: number) => `${val.toLocaleString("ro-RO")} RON`;

  return (
    <div>
      {/* Returns Table */}
      <div className="glass-card">
        {loading ? (
          <div className="table-loading">
            <Loader className="spin" size={32} />
            <span>Se încarcă cererile de retur...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="table-empty">
            <span>Nu s-a înregistrat nicio cerere de retur.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Cumpărător</th>
                  <th>Produs</th>
                  <th>Motiv</th>
                  <th>Descriere Detaliată</th>
                  <th>Valoare Comandă</th>
                  <th>Dată Cerere</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Decizie Admin</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const productTitle = item.orders?.stock_items?.products?.Title || item.orders?.used_items?.products?.Title || "Produs";
                  return (
                    <tr key={item.Id}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        #{item.OrderId.substring(0, 8)}
                      </td>
                      <td>{item.users ? `${item.users.FirstName} ${item.users.LastName}` : "Membru"}</td>
                      <td style={{ fontWeight: 500 }}>{productTitle}</td>
                      <td style={{ fontWeight: 600, color: "var(--warning)" }}>{item.Reason || "—"}</td>
                      <td style={{ fontSize: "0.88rem", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.Description || ""}>
                        {item.Description || "—"}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.orders ? formatCurrency(item.orders.TotalPrice) : "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(item.CreatedAt).toLocaleDateString("ro-RO")}
                      </td>
                      <td>
                        <span className={`badge ${statusMap[item.Status]?.class || "badge-info"}`}>
                          {statusMap[item.Status]?.label || "În așteptare"}
                        </span>
                      </td>
                      <td>
                        {item.Status === 0 ? (
                          <div className="table-actions">
                            <button className="btn-icon" onClick={() => handleApprove(item.Id)} title="Aprobă Retur" style={{ color: "var(--success)" }}>
                              <Check size={14} />
                            </button>
                            <button className="btn-icon" onClick={() => handleRejectOpen(item.Id)} title="Respinge Retur" style={{ color: "var(--danger)" }}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontStyle: "italic" }}>Soluționat</span>
                        )}
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

      {/* Rejection Reason Modal */}
      {isRejectOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3>Respingere Cerere Retur</h3>
              <button className="btn-icon" onClick={() => { setIsRejectOpen(false); setPendingReturnId(null); }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Te rog să explici de ce este respins returul:</label>
                <textarea 
                  className="form-control" 
                  rows={4}
                  required
                  placeholder="Ex: Cererea a fost depusă după perioada legală de 14 zile, iar produsul prezintă urme vizibile de purtare."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setIsRejectOpen(false); setPendingReturnId(null); }}>
                Anulează
              </button>
              <button type="button" className="btn btn-primary" onClick={submitRejection} disabled={modalLoading || !rejectReason.trim()}>
                {modalLoading && <Loader className="spin" size={14} />}
                <span>Respinge Returul</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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
      `}</style>
    </div>
  );
}
