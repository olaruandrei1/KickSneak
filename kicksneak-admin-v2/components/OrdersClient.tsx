"use client";

import { useState, useEffect } from "react";
import { 
  getOrders, 
  updateOrderStatus, 
  updateTrackingNumber, 
  refundOrder 
} from "@/app/orders/actions";
import { Eye, Edit, Truck, RotateCcw, AlertTriangle, X, Loader, Search } from "lucide-react";

interface OrderItem {
  Id: string;
  Status: number;
  TotalPrice: number;
  TrackingNumber: string | null;
  CreatedAt: Date;
  users: {
    Id: string;
    FirstName: string | null;
    LastName: string | null;
    FirebaseUid: string | null;
  } | null;
  stock_items: {
    products: { Title: string | null; brands: { Name: string | null } | null } | null;
    sizes: { SizeLabel: string | null } | null;
  } | null;
  used_items: {
    products: { Title: string | null; brands: { Name: string | null } | null } | null;
    sizes: { SizeLabel: string | null } | null;
  } | null;
  user_addresses_orders_BuyerAddressIdTouser_addresses: {
    AddressName: string | null;
    FirstName: string | null;
    LastName: string | null;
    Country: string | null;
    City: string | null;
    County: string | null;
    Street: string | null;
    StreetNumber: string | null;
    Building: string | null;
    Apartment: string | null;
    Phone: string | null;
    DeliveryInstructions: string | null;
  } | null;
}

interface OrdersClientProps {
  initialOrders: { items: any[]; total: number };
}

const statusMap: { [key: number]: { label: string; class: string } } = {
  0: { label: "Plasată", class: "badge-warning" },
  1: { label: "Confirmată", class: "badge-info" },
  2: { label: "Expediată", class: "badge-info" },
  3: { label: "Livrată", class: "badge-success" },
  4: { label: "Anulată / Refunded", class: "badge-danger" },
  5: { label: "Returnată", class: "badge-danger" },
};

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders.items);
  const [total, setTotal] = useState(initialOrders.total);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<number | undefined>(undefined); // undefined means "All"
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [trackingNo, setTrackingNo] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await getOrders({
        statusFilter: selectedTab,
        page,
        pageSize
      });
      setOrders(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedTab, page]);

  // Open modal details
  const handleOpenDetails = (order: OrderItem) => {
    setSelectedOrder(order);
    setTrackingNo(order.TrackingNumber || "");
  };

  // Change order status
  const handleStatusChange = async (orderId: string, status: number) => {
    setModalLoading(true);
    try {
      await updateOrderStatus(orderId, status);
      // Refresh current details
      const result = await getOrders({ statusFilter: selectedTab, page, pageSize });
      setOrders(result.items);
      const updatedOrder = result.items.find(o => o.Id === orderId);
      setSelectedOrder(updatedOrder || null);
    } catch (err) {
      console.error("Failed to change status:", err);
    } finally {
      setModalLoading(false);
    }
  };

  // Submit tracking number
  const handleTrackingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !trackingNo.trim()) return;
    setModalLoading(true);
    try {
      await updateTrackingNumber(selectedOrder.Id, trackingNo);
      // Refresh
      const result = await getOrders({ statusFilter: selectedTab, page, pageSize });
      setOrders(result.items);
      const updatedOrder = result.items.find(o => o.Id === selectedOrder.Id);
      setSelectedOrder(updatedOrder || null);
    } catch (err) {
      console.error("Failed to update tracking:", err);
    } finally {
      setModalLoading(false);
    }
  };

  // Process Refund
  const handleRefund = async (orderId: string) => {
    if (confirm("Sigur dorești să anulezi comanda și să procesezi returnarea banilor (Refund)? Această acțiune este ireversibilă.")) {
      setModalLoading(true);
      try {
        await refundOrder(orderId);
        const result = await getOrders({ statusFilter: selectedTab, page, pageSize });
        setOrders(result.items);
        const updatedOrder = result.items.find(o => o.Id === orderId);
        setSelectedOrder(updatedOrder || null);
      } catch (err) {
        console.error("Refund failed:", err);
      } finally {
        setModalLoading(false);
      }
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const formatCurrency = (val: number) => `${val.toLocaleString("ro-RO")} RON`;

  const getProductTitleAndSize = (order: OrderItem) => {
    if (order.stock_items) {
      return {
        title: order.stock_items.products?.Title || "Sneaker",
        brand: order.stock_items.products?.brands?.Name || "Brand",
        size: order.stock_items.sizes?.SizeLabel || "—",
        type: "Nou"
      };
    } else if (order.used_items) {
      return {
        title: order.used_items.products?.Title || "Sneaker",
        brand: order.used_items.products?.brands?.Name || "Brand",
        size: order.used_items.sizes?.SizeLabel || "—",
        type: "Used"
      };
    }
    return { title: "Produs indisponibil", brand: "—", size: "—", type: "" };
  };

  return (
    <div>
      {/* Tabs Filter */}
      <div className="tabs-container" style={{ marginBottom: "2rem" }}>
        <button className={`tab-btn ${selectedTab === undefined ? "active" : ""}`} onClick={() => { setSelectedTab(undefined); setPage(1); }}>
          Toate
        </button>
        <button className={`tab-btn ${selectedTab === 0 ? "active" : ""}`} onClick={() => { setSelectedTab(0); setPage(1); }}>
          Plasate
        </button>
        <button className={`tab-btn ${selectedTab === 1 ? "active" : ""}`} onClick={() => { setSelectedTab(1); setPage(1); }}>
          Confirmate
        </button>
        <button className={`tab-btn ${selectedTab === 2 ? "active" : ""}`} onClick={() => { setSelectedTab(2); setPage(1); }}>
          Expediate
        </button>
        <button className={`tab-btn ${selectedTab === 3 ? "active" : ""}`} onClick={() => { setSelectedTab(3); setPage(1); }}>
          Livrate
        </button>
        <button className={`tab-btn ${selectedTab === 4 ? "active" : ""}`} onClick={() => { setSelectedTab(4); setPage(1); }}>
          Anulate
        </button>
        <button className={`tab-btn ${selectedTab === 5 ? "active" : ""}`} onClick={() => { setSelectedTab(5); setPage(1); }}>
          Returnate
        </button>
      </div>

      {/* Orders Table */}
      <div className="glass-card">
        {loading ? (
          <div className="table-loading">
            <Loader className="spin" size={32} />
            <span>Se încarcă comenzile...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="table-empty">
            <span>Nu există comenzi în această categorie.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Cumpărător</th>
                  <th>Produs</th>
                  <th>Mărime</th>
                  <th>Preț Total</th>
                  <th>Status</th>
                  <th>Tracking</th>
                  <th>Dată</th>
                  <th style={{ textAlign: "right" }}>Detalii</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const prod = getProductTitleAndSize(o);
                  return (
                    <tr key={o.Id}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        #{o.Id.substring(0, 8)}
                      </td>
                      <td>
                        {o.users ? `${o.users.FirstName} ${o.users.LastName}` : "Necunoscut"}
                      </td>
                      <td>
                        <strong>[{prod.type}]</strong> {prod.title} ({prod.brand})
                      </td>
                      <td>{prod.size}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(o.TotalPrice)}</td>
                      <td>
                        <span className={`badge ${statusMap[o.Status]?.class || "badge-info"}`}>
                          {statusMap[o.Status]?.label || "Plasată"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {o.TrackingNumber || "—"}
                      </td>
                      <td style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                        {new Date(o.CreatedAt).toLocaleDateString("ro-RO")}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn-icon" onClick={() => handleOpenDetails(o)}>
                          <Eye size={14} />
                        </button>
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

      {/* Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content glass-card order-modal">
            <div className="modal-header">
              <h3>Detalii Comandă #{selectedOrder.Id.substring(0, 8)}</h3>
              <button className="btn-icon" onClick={() => setSelectedOrder(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body order-modal-body">
              {modalLoading && (
                <div className="modal-loader-overlay">
                  <Loader className="spin" size={32} />
                  <span>Procesare...</span>
                </div>
              )}

              {/* Order Info & Status */}
              <div className="order-summary-row">
                <div className="summary-item">
                  <span className="summary-label">Creată la:</span>
                  <span className="summary-val">{new Date(selectedOrder.CreatedAt).toLocaleString("ro-RO")}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Preț Total:</span>
                  <span className="summary-val highlight">{formatCurrency(selectedOrder.TotalPrice)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Status Curent:</span>
                  <span className={`badge ${statusMap[selectedOrder.Status]?.class || "badge-info"}`} style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
                    {statusMap[selectedOrder.Status]?.label || "Plasată"}
                  </span>
                </div>
              </div>

              {/* Grid: Shipping Address & Product Info */}
              <div className="order-grid">
                {/* Product Detail */}
                <div className="order-section">
                  <h4 className="section-title">Produs Cumpărat</h4>
                  {(() => {
                    const prod = getProductTitleAndSize(selectedOrder);
                    return (
                      <div className="item-detail-box">
                        <p className="detail-line">Denumire: <strong>{prod.title}</strong></p>
                        <p className="detail-line">Brand: <strong>{prod.brand}</strong></p>
                        <p className="detail-line">Mărime: <strong>{prod.size}</strong></p>
                        <p className="detail-line">Stare articol: <strong>{prod.type === "Nou" ? "Nou / In Cutie" : "Utilizat / Conditionat"}</strong></p>
                      </div>
                    );
                  })()}

                  {/* Actions Area */}
                  <div className="order-actions-section">
                    <h4 className="section-title">Actualizare Status</h4>
                    <div className="action-buttons-grid">
                      {selectedOrder.Status === 0 && (
                        <button className="btn btn-primary" onClick={() => handleStatusChange(selectedOrder.Id, 1)}>
                          Confirmă Comanda
                        </button>
                      )}
                      
                      {selectedOrder.Status === 1 && (
                        <div className="shipping-form-wrapper">
                          <form onSubmit={handleTrackingSubmit} className="tracking-form">
                            <input 
                              type="text" 
                              required 
                              placeholder="Introdu AWB / Tracking..." 
                              className="form-control"
                              value={trackingNo}
                              onChange={(e) => setTrackingNo(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary">
                              <Truck size={14} /> Expediază
                            </button>
                          </form>
                        </div>
                      )}

                      {selectedOrder.Status === 2 && (
                        <button className="btn btn-primary" style={{ background: "var(--success)" }} onClick={() => handleStatusChange(selectedOrder.Id, 3)}>
                          Marchează ca Livrată
                        </button>
                      )}

                      {/* Cancel/Refund Option (Valid if not delivered/cancelled/returned) */}
                      {selectedOrder.Status < 3 && (
                        <button className="btn btn-danger" onClick={() => handleRefund(selectedOrder.Id)}>
                          Anulează comanda (Refund)
                        </button>
                      )}

                      {/* Return Approval Trigger (if client wants to return, or manual transition) */}
                      {selectedOrder.Status === 3 && (
                        <button className="btn btn-secondary" onClick={() => handleStatusChange(selectedOrder.Id, 5)}>
                          <RotateCcw size={14} /> Marchează Retur
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipping info */}
                <div className="order-section">
                  <h4 className="section-title font-medium">Date Expediere Cumpărător</h4>
                  {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses ? (
                    <div className="address-detail-box">
                      <p className="address-line">
                        Destinatar: <strong>
                          {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.FirstName} {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.LastName}
                        </strong>
                      </p>
                      <p className="address-line">
                        Adresă: {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.Street} {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.StreetNumber}
                      </p>
                      <p className="address-line">
                        Locație: {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.City}, {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.County}, {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.Country}
                      </p>
                      {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.Apartment && (
                        <p className="address-line">Ap: {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.Apartment} (Clădire: {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.Building})</p>
                      )}
                      <p className="address-line">Telefon: <strong>{selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.Phone}</strong></p>
                      {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.DeliveryInstructions && (
                        <div className="delivery-notes">
                          <AlertTriangle size={14} style={{ color: "var(--warning)", flexShrink: 0 }} />
                          <p>Instrucțiuni: {selectedOrder.user_addresses_orders_BuyerAddressIdTouser_addresses.DeliveryInstructions}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="no-address-info">Nu s-a înregistrat adresa de livrare (Eroare date).</div>
                  )}

                  {/* Tracking info */}
                  {selectedOrder.TrackingNumber && (
                    <div className="tracking-info-box">
                      <Truck size={16} />
                      <p>Număr AWB înregistrat: <strong>{selectedOrder.TrackingNumber}</strong></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .order-modal {
          max-width: 800px;
        }

        .order-modal-body {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .modal-loader-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(8, 12, 20, 0.7);
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #fff;
        }

        .order-summary-row {
          display: flex;
          gap: 2rem;
          padding-bottom: 1.2rem;
          border-bottom: 1px solid var(--border-color);
        }

        .summary-item {
          display: flex;
          flex-direction: column;
        }

        .summary-label {
          font-size: 0.8rem;
          color: var(--text-dim);
          text-transform: uppercase;
        }

        .summary-val {
          font-size: 1.05rem;
          font-weight: 600;
          color: #fff;
          margin-top: 0.2rem;
        }

        .summary-val.highlight {
          color: var(--secondary-color);
          font-size: 1.2rem;
          font-weight: 700;
        }

        .order-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 1.5rem;
        }

        .order-section {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
          margin-bottom: 0.2rem;
        }

        .item-detail-box, .address-detail-box {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-line, .address-line {
          font-size: 0.92rem;
          color: var(--text-muted);
        }

        .detail-line strong, .address-line strong {
          color: #fff;
        }

        .delivery-notes {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.1);
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          color: var(--warning);
          line-height: 1.3;
        }

        .tracking-info-box {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.15);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.88rem;
          color: var(--info);
        }

        .order-actions-section {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .action-buttons-grid {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .tracking-form {
          display: flex;
          gap: 0.5rem;
        }

        .tracking-form input {
          flex: 1;
        }

        .no-address-info, .table-loading, .table-empty {
          font-size: 0.85rem;
          color: var(--text-dim);
          text-align: center;
          padding: 2rem 0;
        }

        .table-loading, .table-empty {
          padding: 5rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
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

        @media (max-width: 768px) {
          .order-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
