import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavStore } from '../../../../store/navStore';
import { useCartStore } from '../../../../store/cartStore';
import { useFavoritesStore } from '../../../../store/favoritesStore';
import { useAuthStore } from '../../../../store/authStore';
import { SearchBox } from '../../../molecules/SearchBox/SearchBox';
import type { NavbarCategory } from '../../../../types/product';
import { useNotificationStore } from '../../../../store/notificationStore';
import { NotificationPanel } from '../../../molecules/NotificationPanel/NotificationPanel';
import styles from './NavMobile.module.css';

interface NavMobileProps {
  categories: NavbarCategory[];
}

export const NavMobile = ({ categories }: NavMobileProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    searchOpenMobile, setSearchOpenMobile,
    megaMenuOpenMobile, setMegaMenuOpenMobile,
  } = useNavStore();
  const { items: cartItems } = useCartStore();
  const { items: favItems } = useFavoritesStore();
  const { unreadCount } = useNotificationStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  
  const isSeller = JSON.parse(localStorage.getItem('kicksneak-is-seller') ?? 'false');

  const tabs = [
    {
      id: 'seller',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <polyline points="9 22 9 12 15 12 15 22"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      label: 'Sell',
      path: user
        ? (isSeller ? '/profile?section=seller-listings' : '/profile?section=overview')
        : '/login',
    },
    {
      id: 'favorites',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
            stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Saved',
      path: '/favorites',
      badge: favItems.length,
    },
    {
      id: 'search',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      label: 'Search',
      path: null,
    },
    {
      id: 'cart',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" />
          <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Cart',
      path: '/cart',
      badge: cartItems.length,
    },
    {
      id: 'notifications',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      label: 'Alerts',
      path: null,
      badge: unreadCount,
    },
    {
      id: 'profile',
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      label: 'Profile',
      path: user ? '/profile' : '/login',
    },
  ];

  return (
    <>
      {searchOpenMobile && (
        <div className={styles.searchOverlay}>
          <div
            className={styles.searchOverlayBg}
            onClick={() => { setSearchOpenMobile(false); setMegaMenuOpenMobile(false); }}
          />

          <div className={`${styles.searchPanel} ${megaMenuOpenMobile ? styles.searchPanelSlid : ''}`}>
            <div className={styles.searchInputWrap}>
              <div className={styles.searchTopRow}>
                <SearchBox
                  variant="mobile"
                  autoFocus={!megaMenuOpenMobile}
                  onClose={() => { setSearchOpenMobile(false); setMegaMenuOpenMobile(false); }}
                  onProductClick={(p) => {
                    navigate(`/product/${p.id}`);
                    setSearchOpenMobile(false);
                    setMegaMenuOpenMobile(false);
                  }}
                />
                <button
                  className={styles.closeSearchBtn}
                  onClick={() => { setSearchOpenMobile(false); setMegaMenuOpenMobile(false); }}
                >
                  ✕
                </button>
              </div>

              <button
                className={styles.browseBtn}
                onClick={() => setMegaMenuOpenMobile(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                  <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Browse Categories
              </button>
            </div>
          </div>

          {/* MegaMenu panel */}
          <div className={`${styles.megaPanel} ${megaMenuOpenMobile ? styles.megaPanelOpen : ''}`}>
            <div className={styles.megaHeader}>
              <button className={styles.megaBack} onClick={() => setMegaMenuOpenMobile(false)}>
                ← Back
              </button>
              <span className={styles.megaTitle}>Categories</span>
            </div>

            <div className={styles.megaList}>
              {categories.map((cat) => (
                <div key={cat.id} className={styles.megaCat}>
                  <button
                    className={`${styles.megaCatBtn} ${cat.highlight ? styles.highlight : ''}`}
                    onClick={() => {
                    if (cat.id === 'brands') {
                        navigate('/brands');
                        setSearchOpenMobile(false);
                        setMegaMenuOpenMobile(false);
                    } else {
                        setExpandedId(expandedId === cat.id ? null : cat.id);
                    }
                  }}
                  >
                    <span>{cat.label}</span>
                    <span className={`${styles.chevron} ${expandedId === cat.id ? styles.chevronOpen : ''}`}>›</span>
                  </button>

                  {expandedId === cat.id && (
                    <div className={styles.megaSub}>
                      {cat.columns.map((col) => (
                        <div key={col.title} className={styles.megaCol}>
                          <span className={styles.megaColTitle}>{col.title}</span>
                          {col.items.map((item) => (
                            <button
                              key={item.href}
                              className={styles.megaLink}
                              onClick={() => {
                                navigate(item.href);
                                setSearchOpenMobile(false);
                                setMegaMenuOpenMobile(false);
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {notifOpen && (
        <div className={styles.notifOverlay}>
          <div
            className={styles.searchOverlayBg}
            onClick={() => setNotifOpen(false)}
          />
          <div className={styles.notifPanel}>
            <NotificationPanel
              variant="popup"
              onClose={() => setNotifOpen(false)}
            />
          </div>
        </div>
      )}

      <nav className={styles.nav}>
        {tabs.map((tab) => {
          const isSearch = tab.id === 'search';
          const isNotif = tab.id === 'notifications';
          const active =
            isSearch ? searchOpenMobile
              : isNotif ? notifOpen
                : tab.path ? isActive(tab.path)
                  : false;

          return (
            <button
              key={tab.id}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              onClick={() => {
                if (isSearch) {
                  setSearchOpenMobile(!searchOpenMobile);
                  if (searchOpenMobile) setMegaMenuOpenMobile(false);
                  if (!searchOpenMobile) setNotifOpen(false);
                } else if (isNotif) {
                  setNotifOpen((v) => !v);
                  setSearchOpenMobile(false);
                } else if (tab.path) {
                  navigate(tab.path);
                }
              }}
              aria-label={tab.label}
            >
              <div className={`${styles.iconWrap} ${active ? styles.iconWrapActive : ''}`}>
                {tab.icon}
                {tab.badge != null && tab.badge > 0 && (
                  <span className={styles.badge}>
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`${styles.label} ${active ? styles.labelActive : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};