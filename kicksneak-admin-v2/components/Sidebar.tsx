"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ShieldCheck, 
  ShoppingCart, 
  Users, 
  Store, 
  RotateCcw, 
  Star, 
  FolderTree, 
  Bell, 
  MessageCircle, 
  Settings 
} from "lucide-react";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Produse", href: "/products", icon: ShoppingBag },
  { name: "Verificare Stoc", href: "/stock", icon: ShieldCheck },
  { name: "Comenzi", href: "/orders", icon: ShoppingCart },
  { name: "Utilizatori", href: "/users", icon: Users },
  { name: "Vânzători", href: "/sellers", icon: Store },
  { name: "Retururi", href: "/returns", icon: RotateCcw },
  { name: "Recenzii", href: "/reviews", icon: Star },
  { name: "Catalog", href: "/catalog", icon: FolderTree },
  { name: "Notificări", href: "/notifications", icon: Bell },
  { name: "Chat Suport", href: "/chat", icon: MessageCircle },
  { name: "Setări", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-logo">KS</span>
        <span className="brand-name">KickSneak Admin</span>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        .sidebar {
          background-color: var(--bg-sidebar);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .brand-logo {
          background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
          color: #fff;
          font-weight: 700;
          font-size: 1.1rem;
          padding: 0.4rem 0.6rem;
          border-radius: var(--radius-sm);
        }

        .brand-name {
          font-weight: 700;
          font-size: 1.1rem;
          letter-spacing: -0.02em;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1rem;
          overflow-y: auto;
          flex: 1;
        }

        :global(.nav-link) {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.75rem 1rem;
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 500;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        :global(.nav-link:hover) {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-main);
        }

        :global(.nav-link.active) {
          background: rgba(255, 96, 0, 0.1);
          color: var(--primary-color);
          font-weight: 600;
        }
      `}</style>
    </aside>
  );
}
