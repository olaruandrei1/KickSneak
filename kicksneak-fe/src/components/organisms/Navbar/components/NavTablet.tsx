import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../../store/authStore';
import { useCartStore } from '../../../../store/cartStore';
import { useFavoritesStore } from '../../../../store/favoritesStore';
import { SearchBox } from '../../../molecules/SearchBox/SearchBox';
import type { NavbarCategory } from '../../../../types/product';
import { NotificationPanel } from '../../../molecules/NotificationPanel/NotificationPanel';
import { useNotificationStore } from '../../../../store/notificationStore';
import styles from './NavTablet.module.css';

interface NavTabletProps {
    categories: NavbarCategory[];
}

export const NavTablet = ({ categories }: NavTabletProps) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { items: cartItems } = useCartStore();
    const { items: favItems } = useFavoritesStore();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const { unreadCount } = useNotificationStore();
    const [notifPanelOpen, setNotifPanelOpen] = useState(false);

    const isSeller = JSON.parse(localStorage.getItem('kicksneak-is-seller') ?? 'false');

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node))
                setDrawerOpen(false);
        };
        if (drawerOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [drawerOpen]);

    return (
        <>
            <nav className={styles.nav}>
                <div className={styles.inner}>
                    <button
                        className={`${styles.hamburger} ${drawerOpen ? styles.open : ''}`}
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        aria-label="Menu"
                    >
                        <span /><span /><span />
                    </button>

                    <button className={styles.logo} onClick={() => navigate('/')}>
                        KickSneak
                    </button>

                    <div className={styles.searchWrap}>
                        <SearchBox
                            variant="desktop"
                            onProductClick={(p) => navigate(`/product/${p.id}`)}
                        />
                    </div>

                    <div className={styles.icons}>
                        <button className={styles.iconBtn}
                            onClick={() => navigate('/favorites')} aria-label="Favorites">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                                    stroke="currentColor" strokeWidth="2" />
                            </svg>
                            {favItems.length > 0 && <span className={styles.badge}>{favItems.length}</span>}
                        </button>

                        <button className={styles.iconBtn}
                            onClick={() => navigate('/cart')} aria-label="Cart">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" />
                                <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            {cartItems.length > 0 && <span className={styles.badge}>{cartItems.length}</span>}
                        </button>

                        <button className={styles.profileBtn}
                            onClick={() => navigate(user ? '/profile' : '/login')}>
                            {user?.photoURL
                                ? <img src={user.photoURL} alt="avatar" className={styles.avatar} referrerPolicy="no-referrer" />
                                : <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            }
                        </button>

                        <div className={styles.notifWrap}>
                            <button
                                className={styles.iconBtn}
                                onClick={() => setNotifPanelOpen((v) => !v)}
                                aria-label="Notifications"
                            >
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                            </button>
                            {notifPanelOpen && (
                                <NotificationPanel variant="dropdown" onClose={() => setNotifPanelOpen(false)} />
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {drawerOpen && (
                <div className={styles.drawerOverlay}>
                    <div ref={drawerRef} className={styles.drawer}>
                        <div className={styles.drawerHeader}>
                            <span className={styles.drawerTitle}>Browse</span>
                            <button className={styles.drawerClose}
                                onClick={() => setDrawerOpen(false)}>✕</button>
                        </div>

                        <button
                            className={styles.drawerSeller}
                            onClick={() => {
                                if (!user) { navigate('/login'); setDrawerOpen(false); return; }
                                navigate(isSeller ? '/profile?section=seller-listings' : '/profile?section=overview');
                                setDrawerOpen(false);
                            }}
                        >
                            {user && isSeller ? '→ Seller Dashboard' : '→ Become a Seller'}
                        </button>

                        <div className={styles.drawerCats}>
                            {categories.map((cat) => (
                                <div key={cat.id} className={styles.drawerCat}>
                                    <button
                                        className={`${styles.drawerCatBtn} ${cat.highlight ? styles.highlight : ''}`}
                                        onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                                    >
                                        <span>{cat.label}</span>
                                        <span className={`${styles.chevron} ${expandedId === cat.id ? styles.chevronOpen : ''}`}>
                                            ›
                                        </span>
                                    </button>

                                    {expandedId === cat.id && (
                                        <div className={styles.drawerSub}>
                                            {cat.columns.map((col) => (
                                                <div key={col.title} className={styles.drawerCol}>
                                                    <span className={styles.drawerColTitle}>{col.title}</span>
                                                    {col.items.map((item) => (
                                                        <button
                                                            key={item.href}
                                                            className={styles.drawerLink}
                                                            onClick={() => { navigate(item.href); setDrawerOpen(false); }}
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
        </>
    );
};