import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Drawer, useMediaQuery } from '@mui/material';
import { Menu } from '@mui/icons-material';
import { httpClient } from '../../services/axiosService';
import { ApiRoutes } from '../../services/apiRoutes';
import type { UserProfile, ProfileSection } from '../../types/profile';
import { useAuthStore } from '../../store/authStore';
import { ProfileSidebar } from './components/ProfileSidebar';
import { OverviewSection } from './components/sections/OverviewSection';
import { OrdersSection } from './components/sections/OrdersSections';
import { AddressesSection } from './components/sections/AddressesSection';
import { SizesSection } from './components/sections/SizesSection';
import { ReturnsSection } from './components/sections/ReturnsSection';
import { ChatSection } from './components/sections/ChatSection';
import { SettingsSection } from './components/sections/SettingsSection';
import { SellerListingsSection } from './components/sections/SellerListingsSection';
import { SellerSalesSection } from './components/sections/SellerSalesSection';
import { SellerReturnsSection } from './components/sections/SellerReturnsSection';
import { SellerChatSection } from './components/sections/SellerChatSection';
import { BecomeSellerModal } from './components/BecomeSellerModal';
import { Spinner } from '../../components/atoms/Spinner/Spinner';
import styles from './ProfilePage.module.css';
import { WatchedAuctionsSection } from './components/sections/WatchedAuctionsSection';
import { MyAuctionsSection } from './components/sections/MyAuctionsSection';

export const ProfilePage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuthStore();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [becomeSellerOpen, setBecomeSellerOpen] = useState(false);

    const section = (searchParams.get('section') as ProfileSection) ?? 'overview';

    const setSection = (s: ProfileSection) => {
        setSearchParams({ section: s });
        setSidebarOpen(false);
    };

    const action = searchParams.get('action');

    useEffect(() => {
        if (action === 'become-seller' && profile && !profile.isSeller) {
            setBecomeSellerOpen(true);
            setSearchParams({ section: 'overview' });
        }
    }, [action, profile]);

    useEffect(() => {
        const { user } = useAuthStore.getState();

        httpClient.get<UserProfile>(ApiRoutes.profile)
            .then((r) => {
                const merged: UserProfile = {
                    ...r.data,
                    displayName: user?.displayName ?? r.data.displayName,
                    email: user?.email ?? r.data.email,
                    photoURL: user?.photoURL ?? r.data.photoURL,
                };
                setProfile(merged);
                localStorage.setItem('kicksneak-is-seller', JSON.stringify(merged.isSeller));
            })
            .catch(() => {
                if (user) {
                    setProfile({
                        uid: user.uid,
                        displayName: user.displayName ?? 'User',
                        email: user.email ?? '',
                        photoURL: user.photoURL ?? null,
                        isSeller: false,
                        seller: null,
                        addresses: [],
                        joinedAt: new Date().toISOString(),
                        totalSpent: 0,
                        totalOrders: 0,
                        sizePreferences: {
                            footwearEU: '',
                            footwearUS: '',
                            footwearUK: '',
                            tops: '',
                            bottoms: '',
                            preferredSystem: 'EU',
                        },
                    });
                }
                localStorage.setItem('kicksneak-is-seller', 'false');
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Spinner fullPage size="lg" />;
    if (!profile) return null;

    const renderSection = () => {
        switch (section) {
            case 'overview': return <OverviewSection />;
            case 'orders': return <OrdersSection />;
            case 'addresses': return <AddressesSection />;
            case 'sizes': return <SizesSection />;
            case 'returns': return <ReturnsSection />;
            case 'chat': return <ChatSection profile={profile} onProfileUpdate={setProfile} />;
            case 'settings': return <SettingsSection profile={profile} onProfileUpdate={setProfile} />;
            case 'seller-listings': return <SellerListingsSection profile={profile} onProfileUpdate={setProfile} />;
            case 'seller-sales': return <SellerSalesSection profile={profile} onProfileUpdate={setProfile} />;
            case 'seller-returns': return <SellerReturnsSection profile={profile} onProfileUpdate={setProfile} />;
            case 'seller-chat': return <SellerChatSection profile={profile} onProfileUpdate={setProfile} />;
            case 'my-auctions': return <MyAuctionsSection />;
            case 'watched-auctions': return <WatchedAuctionsSection />;
            default: return <OverviewSection />;
        }
    };

    const sidebar = (
        <ProfileSidebar
            profile={profile}
            activeSection={section}
            onSelect={setSection}
            onBecomeSeller={() => setBecomeSellerOpen(true)}
        />
    );

    return (
        <div className={styles.page}>
            <div className={styles.inner}>

                {/* Desktop sidebar */}
                {!isMobile && (
                    <aside className={styles.sidebarCol}>{sidebar}</aside>
                )}

                {/* Mobile sidebar drawer */}
                {isMobile && (
                    <>
                        <div className={styles.mobileHeader}>
                            <button
                                className={styles.menuBtn}
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu sx={{ fontSize: 22 }} />
                            </button>
                            <span className={styles.mobileTitle}>
                                {section.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </span>
                        </div>
                        <Drawer
                            anchor="left"
                            open={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            slotProps={{
                                paper: {
                                    sx: {
                                        background: 'transparent',
                                        boxShadow: 'none',
                                        width: 280,
                                    },
                                },
                            }}
                        >
                            {sidebar}
                        </Drawer>
                    </>
                )}

                {/* Content */}
                <main className={styles.content}>
                    {renderSection()}
                </main>

            </div>

            <BecomeSellerModal
                open={becomeSellerOpen}
                onClose={() => setBecomeSellerOpen(false)}
                onSuccess={(updatedProfile) => {
                    setProfile(updatedProfile);
                    setBecomeSellerOpen(false);
                    setSection('seller-listings');
                }}
            />
        </div>
    );
};