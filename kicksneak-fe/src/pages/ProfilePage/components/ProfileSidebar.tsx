import { useState } from 'react';
import {
    Dashboard, ShoppingBag, Home, Straighten,
    Assignment, Chat, Settings, Store,
    BarChart, KeyboardArrowDown, KeyboardArrowUp,
    AssignmentReturn, SupportAgent, AddBusiness,
    Verified, Gavel,
    EmojiEvents
} from '@mui/icons-material';
import type { UserProfile, ProfileSection } from '../../../types/profile';
import styles from './ProfileSidebar.module.css';

interface ProfileSidebarProps {
    profile: UserProfile;
    activeSection: ProfileSection;
    onSelect: (s: ProfileSection) => void;
    onBecomeSeller: () => void;
}

const USER_SECTIONS = [
    { id: 'overview', label: 'Overview', icon: <Dashboard sx={{ fontSize: 18 }} /> },
    { id: 'orders', label: 'My Orders', icon: <ShoppingBag sx={{ fontSize: 18 }} /> },
    { id: 'addresses', label: 'Addresses & Contact', icon: <Home sx={{ fontSize: 18 }} /> },
    { id: 'sizes', label: 'Size Preferences', icon: <Straighten sx={{ fontSize: 18 }} /> },
    { id: 'returns', label: 'Returns', icon: <AssignmentReturn sx={{ fontSize: 18 }} /> },
    { id: 'chat', label: 'Support Chat', icon: <Chat sx={{ fontSize: 18 }} /> },
    { id: 'settings', label: 'Settings', icon: <Settings sx={{ fontSize: 18 }} /> },
    { id: 'my-auctions', label: 'My Auctions', icon: <EmojiEvents sx={{ fontSize: 18 }} /> },
    { id: 'watched-auctions', label: 'Watched Auctions', icon: <Gavel sx={{ fontSize: 18 }} /> },
] as const;

const SELLER_SECTIONS = [
    { id: 'seller-listings', label: 'My Listings', icon: <Store sx={{ fontSize: 18 }} /> },
    { id: 'seller-sales', label: 'Sales History', icon: <BarChart sx={{ fontSize: 18 }} /> },
    { id: 'seller-returns', label: 'Seller Returns', icon: <Assignment sx={{ fontSize: 18 }} /> },
    { id: 'seller-chat', label: 'Seller Support', icon: <SupportAgent sx={{ fontSize: 18 }} /> },
] as const;

export const ProfileSidebar = ({
    profile, activeSection, onSelect, onBecomeSeller,
}: ProfileSidebarProps) => {
    const [sellerExpanded, setSellerExpanded] = useState(
        activeSection.startsWith('seller')
    );

    return (
        <aside className={styles.sidebar}>
            {/* Avatar + info */}
            <div className={styles.userCard}>
                <div className={styles.avatarWrap}>
                    {profile.photoURL
                        ? <img src={profile.photoURL} alt="avatar" className={styles.avatar} referrerPolicy="no-referrer" />
                        : <div className={styles.avatarFallback}>
                            {(profile.displayName ?? 'U')[0].toUpperCase()}
                        </div>
                    }
                    {profile.isSeller && profile.seller?.verified && (
                        <span className={styles.verifiedBadge}>
                            <Verified sx={{ fontSize: 14 }} />
                        </span>
                    )}
                </div>
                <span className={styles.userName}>{profile.displayName}</span>
                <span className={styles.userEmail}>{profile.email}</span>
                {profile.isSeller && (
                    <span className={styles.sellerTag}>
                        <Store sx={{ fontSize: 11 }} />
                        {profile.seller?.storeName}
                    </span>
                )}
            </div>

            {/* Nav */}
            <nav className={styles.nav}>
                {USER_SECTIONS.map((s) => (
                    <button
                        key={s.id}
                        className={`${styles.navItem} ${activeSection === s.id ? styles.navItemActive : ''}`}
                        onClick={() => onSelect(s.id as ProfileSection)}
                    >
                        <span className={styles.navIcon}>{s.icon}</span>
                        <span className={styles.navLabel}>{s.label}</span>
                    </button>
                ))}

                {/* Seller section */}
                <div className={styles.sellerGroup}>
                    {profile.isSeller ? (
                        <>
                            <button
                                className={styles.sellerGroupHeader}
                                onClick={() => setSellerExpanded((v) => !v)}
                            >
                                <span className={styles.navIcon}><Store sx={{ fontSize: 18 }} /></span>
                                <span className={styles.navLabel}>Seller</span>
                                {sellerExpanded
                                    ? <KeyboardArrowUp sx={{ fontSize: 16, ml: 'auto', color: 'var(--color-text-muted)' }} />
                                    : <KeyboardArrowDown sx={{ fontSize: 16, ml: 'auto', color: 'var(--color-text-muted)' }} />
                                }
                            </button>
                            {sellerExpanded && (
                                <div className={styles.sellerItems}>
                                    {SELLER_SECTIONS.map((s) => (
                                        <button
                                            key={s.id}
                                            className={`${styles.navItem} ${styles.navItemIndented} ${activeSection === s.id ? styles.navItemActive : ''}`}
                                            onClick={() => onSelect(s.id as ProfileSection)}
                                        >
                                            <span className={styles.navIcon}>{s.icon}</span>
                                            <span className={styles.navLabel}>{s.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <button className={styles.becomeSellerBtn} onClick={onBecomeSeller}>
                            <AddBusiness sx={{ fontSize: 18 }} />
                            Become a Seller
                        </button>
                    )}
                </div>
            </nav>
        </aside>
    );
};