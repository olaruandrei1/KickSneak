"use client";

import { usePathname } from "next/navigation";
import { Database, User } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  
  // Resolve page title based on path
  const getPageTitle = (path: string) => {
    switch (path) {
      case "/": return "Dashboard";
      case "/products": return "Gestiune Produse";
      case "/stock": return "Verificare Stoc (Kanban)";
      case "/orders": return "Gestiune Comenzi";
      case "/users": return "Gestiune Utilizatori";
      case "/sellers": return "Gestiune Vânzători";
      case "/returns": return "Cereri Retur";
      case "/reviews": return "Moderare Recenzii";
      case "/catalog": return "Catalog Nomenclatoare";
      case "/notifications": return "Broadcast Notificări";
      case "/chat": return "Chat Suport Live";
      case "/settings": return "Setări Platformă";
      default: return "Panou de Control";
    }
  };

  return (
    <header className="header">
      <div className="header-title-area">
        <h2>{getPageTitle(pathname)}</h2>
      </div>

      <div className="header-actions">
        <div className="db-status">
          <Database size={16} />
          <span>PostgreSQL: </span>
          <span className="status-indicator online">Online</span>
        </div>
        
        <div className="divider" />
        
        <div className="user-profile">
          <div className="user-avatar">
            <User size={16} />
          </div>
          <div className="user-info">
            <span className="user-name">David Admin</span>
            <span className="user-role">Administrator</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: rgba(8, 12, 20, 0.4);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 10;
          height: 70px;
        }

        .header-title-area h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fff;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .db-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.02);
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .status-indicator {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .status-indicator.online {
          color: var(--success);
        }

        .status-indicator.online::before {
          content: "";
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--success);
          box-shadow: 0 0 8px var(--success);
        }

        .divider {
          width: 1px;
          height: 24px;
          background-color: var(--border-color);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 96, 0, 0.1);
          border: 1px solid rgba(255, 96, 0, 0.2);
          color: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #fff;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </header>
  );
}
