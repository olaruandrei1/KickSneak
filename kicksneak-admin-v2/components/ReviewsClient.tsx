"use client";

import { useState, useEffect } from "react";
import { getReviews, deleteReview } from "@/app/reviews/actions";
import { Trash2, Loader, Star, AlertTriangle } from "lucide-react";

interface ReviewItem {
  Id: string;
  BuyerId: string;
  SellerId: string;
  OrderId: string;
  Score: number;
  Title: string | null;
  Comment: string | null;
  CreatedAt: Date;
  users: { FirstName: string | null; LastName: string | null } | null;
  sellers: { StoreName: string | null } | null;
}

interface ReviewsClientProps {
  initialReviews: { items: any[]; total: number };
}

export default function ReviewsClient({ initialReviews }: ReviewsClientProps) {
  const [items, setItems] = useState<ReviewItem[]>(initialReviews.items);
  const [total, setTotal] = useState(initialReviews.total);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const result = await getReviews({ page, pageSize });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page]);

  const handleDelete = async (id: string) => {
    if (confirm("Sigur dorești să elimini această recenzie? Acțiunea este una moderatoare (Soft Delete).")) {
      setLoading(true);
      try {
        await deleteReview(id);
        fetchReviews();
      } catch (err) {
        console.error("Failed to delete review:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Reviews Table */}
      <div className="glass-card">
        {loading ? (
          <div className="table-loading">
            <Loader className="spin" size={32} />
            <span>Se încarcă recenziile...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="table-empty">
            <span>Nu s-a înregistrat nicio recenzie în catalog.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cumpărător</th>
                  <th>Magazin Evaluat</th>
                  <th>Scor (Stele)</th>
                  <th>Titlu Recenzie</th>
                  <th>Comentariu</th>
                  <th>Dată Adăugare</th>
                  <th>Alerte</th>
                  <th style={{ textAlign: "right" }}>Moderează</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isLowScore = item.Score <= 2;
                  return (
                    <tr key={item.Id} style={{ background: isLowScore ? "rgba(239, 68, 68, 0.01)" : "transparent" }}>
                      <td style={{ fontWeight: 500 }}>
                        {item.users ? `${item.users.FirstName} ${item.users.LastName}` : "Membru"}
                      </td>
                      <td>{item.sellers?.StoreName || "Magazin"}</td>
                      <td>
                        <div className="rating-stars">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={14} 
                              fill={i < item.Score ? "var(--warning)" : "none"} 
                              stroke={i < item.Score ? "var(--warning)" : "var(--text-dim)"} 
                              style={{ marginRight: "1px" }}
                            />
                          ))}
                          <span className="rating-val" style={{ marginLeft: "0.4rem", fontWeight: 600 }}>{item.Score}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.Title || "—"}</td>
                      <td style={{ fontSize: "0.88rem", maxWidth: "300px", wordBreak: "break-all" }}>
                        {item.Comment || "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(item.CreatedAt).toLocaleDateString("ro-RO")}
                      </td>
                      <td>
                        {isLowScore ? (
                          <span className="badge badge-danger" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                            <AlertTriangle size={10} /> Scor Scăzut
                          </span>
                        ) : (
                          <span className="badge badge-success">OK</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-icon" onClick={() => handleDelete(item.Id)} title="Elimină Recenzie" style={{ color: "var(--danger)" }}>
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

      <style jsx>{`
        .rating-stars {
          display: flex;
          align-items: center;
        }

        .rating-val {
          font-size: 0.85rem;
          color: #fff;
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
      `}</style>
    </div>
  );
}
