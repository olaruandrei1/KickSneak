"use client";

import { useState, useEffect } from "react";
import { 
  getUsers, 
  toggleUserSuspended, 
  toggleUserBlocked, 
  updateUserRole 
} from "@/app/users/actions";
import { Search, Loader, ShieldAlert, ShieldCheck, UserCheck, Trash2 } from "lucide-react";

interface UserItem {
  Id: string;
  FirebaseUid: string;
  FirstName: string | null;
  LastName: string | null;
  IsSuspended: boolean;
  IsBlocked: boolean;
  RoleId: string | null;
  CreatedAt: Date;
  roles: { Id: string; Name: string | null; Level: number } | null;
  user_contacts: { EmailAddress: string | null }[];
}

interface RoleOption {
  Id: string;
  Name: string | null;
  Level: number;
}

interface UsersClientProps {
  initialUsers: { items: any[]; total: number };
  roles: RoleOption[];
}

export default function UsersClient({ initialUsers, roles }: UsersClientProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers.items);
  const [total, setTotal] = useState(initialUsers.total);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsers({
        search,
        page,
        pageSize
      });
      setUsers(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, page]);

  const handleToggleSuspend = async (userId: string, currentVal: boolean) => {
    const actionText = currentVal ? "anulezi suspendarea" : "suspenzi";
    if (confirm(`Sigur dorești să ${actionText} acest utilizator?`)) {
      setLoading(true);
      try {
        await toggleUserSuspended(userId, !currentVal);
        fetchUsers();
      } catch (err) {
        console.error("Failed to suspend:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleBlock = async (userId: string, currentVal: boolean) => {
    const actionText = currentVal ? "deblochezi" : "blochezi";
    if (confirm(`Sigur dorești să ${actionText} acest utilizator?`)) {
      setLoading(true);
      try {
        await toggleUserBlocked(userId, !currentVal);
        fetchUsers();
      } catch (err) {
        console.error("Failed to block:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    setLoading(true);
    try {
      await updateUserRole(userId, roleId);
      fetchUsers();
    } catch (err) {
      console.error("Failed to update role:", err);
      setLoading(false);
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
            placeholder="Caută după nume, prenume sau Firebase UID..."
            className="form-control"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Users list table */}
      <div className="glass-card">
        {loading ? (
          <div className="table-loading">
            <Loader className="spin" size={32} />
            <span>Se încarcă lista de utilizatori...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="table-empty">
            <span>Nu s-a găsit niciun utilizator.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nume Complet</th>
                  <th>Email Principal</th>
                  <th>Role</th>
                  <th>Firebase UID</th>
                  <th>Dată Înscriere</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Acțiuni Administrative</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const email = u.user_contacts.find(c => c.EmailAddress)?.EmailAddress || "—";
                  return (
                    <tr key={u.Id}>
                      <td style={{ fontWeight: 500 }}>
                        {`${u.FirstName || ""} ${u.LastName || ""}`.trim() || u.FirebaseUid}
                      </td>
                      <td>{email}</td>
                      <td>
                        <select 
                          className="form-control select-role"
                          style={{ width: "140px", padding: "0.3rem 0.5rem" }}
                          value={u.RoleId || ""}
                          onChange={(e) => handleRoleChange(u.Id, e.target.value)}
                        >
                          <option value="">Client (Fără rol)</option>
                          {roles.map(r => (
                            <option key={r.Id} value={r.Id}>{r.Name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text-dim)" }}>
                        {u.FirebaseUid}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(u.CreatedAt).toLocaleDateString("ro-RO")}
                      </td>
                      <td>
                        {u.IsBlocked ? (
                          <span className="badge badge-danger">Blocat</span>
                        ) : u.IsSuspended ? (
                          <span className="badge badge-warning">Suspendat</span>
                        ) : (
                          <span className="badge badge-success">Activ</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          {/* Suspend button */}
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", color: u.IsSuspended ? "var(--success)" : "var(--warning)" }}
                            onClick={() => handleToggleSuspend(u.Id, u.IsSuspended)}
                          >
                            {u.IsSuspended ? "Unsuspend" : "Suspend"}
                          </button>
                          
                          {/* Block button */}
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                            onClick={() => handleToggleBlock(u.Id, u.IsBlocked)}
                          >
                            {u.IsBlocked ? "Unblock" : "Block"}
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

        .select-role {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color);
          color: #fff;
          border-radius: var(--radius-sm);
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
