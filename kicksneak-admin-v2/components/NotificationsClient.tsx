"use client";

import { useState, useEffect } from "react";
import { sendBroadcast, getRecentBroadcasts, searchUsers } from "@/app/notifications/actions";
import { Bell, User, Users, Store, ShieldAlert, Send, Eye, Loader, Check, Info, X } from "lucide-react";
import AlertModal from "./AlertModal";

interface BroadcastHistoryItem {
  title: string;
  body: string;
  type: string;
  target?: string;
  createdAt: Date;
  count: number;
}

interface RoleOption {
  Id: string;
  Name: string | null;
}

interface NotificationsClientProps {
  roles: RoleOption[];
  initialHistory: BroadcastHistoryItem[];
}

export default function NotificationsClient({ roles, initialHistory }: NotificationsClientProps) {
  const [history, setHistory] = useState<BroadcastHistoryItem[]>(initialHistory);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "", type: "info" as "info"|"success"|"error"|"warning" });

  const showAlert = (message: string, type: "info"|"success"|"error"|"warning" = "info", title?: string) => {
    setModalState({ isOpen: true, message, type, title: title || "" });
  };

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState<"all" | "sellers" | "role" | "user">("all");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  
  // User Autocomplete State
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<{ Id: string; FirstName: string | null; LastName: string | null; FirebaseUid: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ Id: string; Name: string } | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);

  // Set default role on mount
  useEffect(() => {
    if (roles.length > 0) {
      setSelectedRoleId(roles[0].Id);
    }
  }, [roles]);

  // Autocomplete search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (userQuery.length >= 2) {
        setSearchingUser(true);
        try {
          const res = await searchUsers(userQuery);
          setUserResults(res);
        } catch (err) {
          console.error(err);
        } finally {
          setSearchingUser(false);
        }
      } else {
        setUserResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [userQuery]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    if (target === "user" && !selectedUser) {
      showAlert("Te rog să selectezi un utilizator din rezultatele căutării!", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await sendBroadcast({
        title,
        body,
        type,
        target,
        roleId: target === "role" ? selectedRoleId : undefined,
        userId: target === "user" && selectedUser ? selectedUser.Id : undefined
      });

      if (res.success) {
        showAlert(`Broadcast trimis cu succes către ${res.count} utilizatori!`, "success");
        // Reset form
        setTitle("");
        setBody("");
        setSelectedUser(null);
        setUserQuery("");
        // Refresh history
        const updatedHistory = await getRecentBroadcasts();
        setHistory(updatedHistory);
      } else {
        showAlert(`Eroare: ${res.message}`, "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Trimiterea broadcastului a eșuat.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getTargetLabel = (b: BroadcastHistoryItem) => {
    switch (b.target) {
      case "user": return "Utilizator specific";
      case "sellers": return "Toți vânzătorii";
      case "role": return "Utilizatori după rol";
      case "all": return "Toți utilizatorii";
    }
    // Fallback for old rows without a target field
    if (b.count === 1) return "Utilizator specific";
    if (b.count > 30) return "Toți utilizatorii";
    return "Grup utilizatori";
  };

  return (
    <div className="notifications-layout">
      {/* Left side: Form & Preview */}
      <div className="form-column">
        <div className="glass-card">
          <h3 className="section-title"><Send size={16} /> Creare Notificare Broadcast</h3>
          
          <form onSubmit={handleSend} className="broadcast-form">
            <div className="form-group">
              <label className="form-label">Titlu Notificare *</label>
              <input 
                type="text" 
                className="form-control"
                required
                placeholder="Ex: Reduceri de Weekend de până la 20%!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Conținut Notificare (Mesaj) *</label>
              <textarea 
                className="form-control"
                required
                rows={4}
                placeholder="Ex: Folosește codul KICKSNEAK20 la checkout pentru a primi reducere la toate modelele Nike Air Max..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">Tip Notificare</label>
                <select 
                  className="form-control"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="info">Informație (Albastru)</option>
                  <option value="warning">Avertisment (Galben)</option>
                  <option value="promo">Promoțional (Verde)</option>
                  <option value="system">Sistem (Roșu)</option>
                </select>
              </div>

              <div className="form-group half">
                <label className="form-label">Grup Țintă (Destinatari)</label>
                <select 
                  className="form-control"
                  value={target}
                  onChange={(e) => { setTarget(e.target.value as any); setSelectedUser(null); }}
                >
                  <option value="all">Toți Utilizatorii</option>
                  <option value="sellers">Toți Vânzătorii</option>
                  <option value="role">Utilizatori după Rol</option>
                  <option value="user">Utilizator Specific</option>
                </select>
              </div>
            </div>

            {/* Target option forms */}
            {target === "role" && (
              <div className="form-group animate-fade">
                <label className="form-label">Alege Rolul Utilizatorilor</label>
                <select 
                  className="form-control"
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                >
                  {roles.map(r => (
                    <option key={r.Id} value={r.Id}>{r.Name}</option>
                  ))}
                </select>
              </div>
            )}

            {target === "user" && (
              <div className="form-group animate-fade">
                <label className="form-label">Caută Utilizator (Nume / Prenume)</label>
                {selectedUser ? (
                  <div className="selected-user-tag">
                    <User size={14} />
                    <span>Selectat: <strong>{selectedUser.Name}</strong></span>
                    <button type="button" className="btn-icon" onClick={() => setSelectedUser(null)} style={{ padding: "0.2rem", background: "none", border: "none" }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="search-box">
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Introdu cel puțin 2 caractere..."
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                    />
                    {searchingUser && <Loader className="spin search-spinner" size={14} />}
                    
                    {userResults.length > 0 && (
                      <div className="autocomplete-dropdown glass-card">
                        {userResults.map(u => (
                          <div 
                            key={u.Id} 
                            className="dropdown-item"
                            onClick={() => {
                              setSelectedUser({ Id: u.Id, Name: `${u.FirstName} ${u.LastName}` });
                              setUserResults([]);
                            }}
                          >
                            <span>{u.FirstName} {u.LastName}</span>
                            <span className="uid-sub">{u.FirebaseUid.substring(0, 10)}...</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading || !title.trim() || !body.trim()} style={{ width: "100%", marginTop: "1rem" }}>
              {loading ? <Loader className="spin" size={16} /> : <Send size={16} />}
              <span>Trimite Broadcast</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right side: Live Preview & History */}
      <div className="history-column">
        {/* Preview block */}
        <div className="glass-card preview-card" style={{ marginBottom: "1.5rem" }}>
          <h3 className="section-title"><Eye size={16} /> Previzualizare Dispozitiv Client</h3>
          
          <div className="mobile-mockup">
            <div className="notification-bubble glass-card">
              <div className="bubble-header">
                <div className="bubble-brand">
                  <span className="logo-dot" style={{ 
                    background: type === "promo" ? "var(--success)" : type === "warning" ? "var(--warning)" : type === "system" ? "var(--danger)" : "var(--info)" 
                  }} />
                  <span>KICKSNEAK APP</span>
                </div>
                <span className="bubble-time">acum</span>
              </div>
              <h4 className="bubble-title">{title || "Titlu Notificare..."}</h4>
              <p className="bubble-body">{body || "Mesajul trimis va apărea în această secțiune sub formă de notificare push pe dispozitivele utilizatorilor din grupul selectat..."}</p>
            </div>
          </div>
        </div>

        {/* History table */}
        <div className="glass-card">
          <h3 className="section-title"><Bell size={16} /> Istoric Trimiteri Recente</h3>
          
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Titlu</th>
                  <th>Grup Țintă</th>
                  <th>Tip</th>
                  <th>Trimiși</th>
                  <th>Dată</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-dim)" }}>Nicio notificare trimisă de admin.</td>
                  </tr>
                ) : (
                  history.map((b, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, fontSize: "0.9rem" }}>{b.title}</td>
                      <td>{getTargetLabel(b)}</td>
                      <td>
                        <span className={`badge ${
                          b.type === "promo" ? "badge-success" : b.type === "warning" ? "badge-warning" : b.type === "system" ? "badge-danger" : "badge-info"
                        }`}>
                          {b.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{b.count} utilizatori</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {new Date(b.createdAt).toLocaleDateString("ro-RO")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AlertModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))} 
        title={modalState.title} 
        message={modalState.message} 
        type={modalState.type} 
      />

      <style jsx>{`
        .notifications-layout {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 1.5rem;
        }

        .section-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }

        .broadcast-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .form-row {
          display: flex;
          gap: 1rem;
        }

        .half {
          flex: 1;
        }

        .selected-user-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 96, 0, 0.15);
          border: 1px solid rgba(255, 96, 0, 0.3);
          padding: 0.5rem 0.8rem;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
        }

        .search-box {
          position: relative;
        }

        .search-spinner {
          position: absolute;
          right: 0.8rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dim);
        }

        .autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          z-index: 20;
          max-height: 200px;
          overflow-y: auto;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }

        .dropdown-item {
          padding: 0.6rem 0.8rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-size: 0.88rem;
          transition: background var(--transition-fast);
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .uid-sub {
          font-size: 0.75rem;
          color: var(--text-dim);
          font-family: monospace;
        }

        /* Mobile preview mockup */
        .mobile-mockup {
          background: radial-gradient(circle at top, rgba(255, 255, 255, 0.03), rgba(0,0,0,0.4));
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 3rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-bubble {
          width: 100%;
          max-width: 320px;
          padding: 1rem;
          border-radius: var(--radius-md);
          animation: bounce 0.5s ease-out;
        }

        .bubble-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.72rem;
          color: var(--text-dim);
          margin-bottom: 0.4rem;
        }

        .bubble-brand {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .logo-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .bubble-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.25rem;
        }

        .bubble-body {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes bounce {
          0% { transform: scale(0.9); opacity: 0; }
          70% { transform: scale(1.02); }
          100% { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 1024px) {
          .notifications-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
