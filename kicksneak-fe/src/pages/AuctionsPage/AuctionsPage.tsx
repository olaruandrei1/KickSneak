import { useEffect, useMemo, useState } from 'react';
import { Drawer, IconButton, Select, MenuItem } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import AuctionCard from '../../components/atoms/AuctionCard/AuctionCard';
import AuctionFiltersSidebar from '../../components/molecules/AuctionFiltersSidebar/AuctionFiltersSidebar';
import { useResponsiveStore } from '../../services/responsiveObserver';
import { cachedFetch } from '../../services/cachedFetchService';
import { ApiRoutes } from '../../services/apiRoutes';
import type { AuctionListItem, AuctionFilters } from '../../types/auction';
import styles from './AuctionsPage.module.css';
import { useAuctionStore } from '../../store/auctionStore';
import { Spinner } from '../../components/atoms/Spinner/Spinner';
import { useAuthStore } from '../../store/authStore';
import { auctionSignalR } from '../../services/auctionSignalRService';
import { auth } from '../../config/firebase';

const SORT_LABELS: Record<NonNullable<AuctionFilters['sortBy']>, string> = {
    ending_soon: 'Ending Soon',
    just_started: 'Just Started',
    most_bids: 'Most Bids',
    highest_price: 'Highest Price',
    lowest_price: 'Lowest Price',
};

interface AuctionsListResponse {
    items: AuctionListItem[];
}

const AuctionsPage = () => {
    const auctions = useAuctionStore((s) => s.auctions);
    const setAuctions = useAuctionStore((s) => s.setAuctions);
    const filters = useAuctionStore((s) => s.filters);
    const setFilters = useAuctionStore((s) => s.setFilters);
    const isLoading = useAuctionStore((s) => s.isLoadingList);
    const setLoading = useAuctionStore((s) => s.setLoadingList);

    const isMobile = useResponsiveStore((s) => s.isMobile);
    const isTablet = useResponsiveStore((s) => s.isTablet);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const { user } = useAuthStore();

    useEffect(() => {
        let cancelled = false;

        const connect = async () => {
            try {
                const token = user ? await auth.currentUser?.getIdToken() : undefined;
                if (cancelled) return;
                await auctionSignalR.joinAuctionsList(token ?? undefined);
            } catch (err) {
                console.warn('[AuctionsPage] SignalR connect failed:', err);
            }
        };

        connect();

        return () => {
            cancelled = true;
            auctionSignalR.leaveAuctionsList();
        };
    }, [user?.uid]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        cachedFetch<AuctionsListResponse>({
            key: 'auctions-list',
            url: ApiRoutes.auctionsList,
            onData: (data, source) => {
                if (cancelled) return;
                setAuctions(data.items);
                if (source === 'api') setLoading(false);
            },
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [setAuctions, setLoading]);

    const filteredSorted = useMemo(() => {
        let list = [...auctions];

        if (filters.brand?.length) {
            list = list.filter((a) => filters.brand!.includes(a.productBrand));
        }

        if (filters.endingWithin) {
            const map = { '1h': 1, '6h': 6, '24h': 24, '3d': 72 };
            const hoursMax = map[filters.endingWithin];
            const cutoff = Date.now() + hoursMax * 3_600_000;
            list = list.filter((a) => new Date(a.endsAt).getTime() <= cutoff);
        }

        if (filters.priceMin !== undefined) {
            list = list.filter((a) => a.currentPrice >= filters.priceMin!);
        }
        if (filters.priceMax !== undefined && filters.priceMax < 5000) {
            list = list.filter((a) => a.currentPrice <= filters.priceMax!);
        }

        if (filters.hasReserve) list = list.filter((a) => a.hasReserve);
        if (filters.reserveMet) list = list.filter((a) => a.reserveMet);

        switch (filters.sortBy) {
            case 'ending_soon':
                list.sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
                break;
            case 'just_started':
                list.sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime());
                break;
            case 'most_bids':
                list.sort((a, b) => b.bidCount - a.bidCount);
                break;
            case 'highest_price':
                list.sort((a, b) => b.currentPrice - a.currentPrice);
                break;
            case 'lowest_price':
                list.sort((a, b) => a.currentPrice - b.currentPrice);
                break;
        }

        return list;
    }, [auctions, filters]);

    const showDrawerToggle = isMobile || isTablet;

    return (
        <div className={styles.page}>
            <header className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Live Auctions</h1>
                    <p className={styles.subtitle}>
                        {filteredSorted.length} {filteredSorted.length === 1 ? 'auction' : 'auctions'} live
                        now
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <Select
                        size="small"
                        value={filters.sortBy ?? 'ending_soon'}
                        onChange={(e) =>
                            setFilters({ sortBy: e.target.value as AuctionFilters['sortBy'] })
                        }
                        className={styles.sortSelect}
                    >
                        {Object.entries(SORT_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                                {label}
                            </MenuItem>
                        ))}
                    </Select>

                    {showDrawerToggle && (
                        <IconButton onClick={() => setDrawerOpen(true)} aria-label="Open filters">
                            <TuneIcon />
                        </IconButton>
                    )}
                </div>
            </header>

            <div className={styles.layout}>
                {!showDrawerToggle && <AuctionFiltersSidebar />}

                <main className={styles.results}>
                    {isLoading && auctions.length === 0 ? (
                        <Spinner size="lg" />
                    ) : filteredSorted.length === 0 ? (
                        <div className={styles.empty}>
                            <p>No auctions match your filters.</p>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {filteredSorted.map((auction) => (
                                <AuctionCard key={auction.id} auction={auction} />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                slotProps={{ paper: { className: styles.drawerPaper } }}
            >
                <AuctionFiltersSidebar />
            </Drawer>
        </div>
    );
};

export default AuctionsPage;