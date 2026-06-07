import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from './GlassCard';
import { useAuctionStore } from '../../../../store/auctionStore';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import CountdownTimer from '../../../../components/atoms/CountdownTimer/CountdownTimer';
import type { AuctionListItem } from '../../../../types/auction';
import styles from './WatchedAuctionsSection.module.css';

export const WatchedAuctionsSection = () => {
    const navigate = useNavigate();
    const watchedIds = useAuctionStore((s) => s.watchedAuctionIds);
    const storeAuctions = useAuctionStore((s) => s.auctions);
    const [fetchedAuctions, setFetchedAuctions] = useState<AuctionListItem[]>([]);

    // Try store first, fetch missing ones
    useEffect(() => {
        if (watchedIds.length === 0) return;

        const missing = watchedIds.filter(id => !storeAuctions.find(a => a.id === id));

        if (missing.length === 0) {
            setFetchedAuctions([]);
            return;
        }

        // Fetch all auctions and filter client-side (simplest approach)
        httpClient.get<{ items: AuctionListItem[] }>(ApiRoutes.auctionsList)
            .then(r => {
                const matched = r.data.items.filter(a => watchedIds.includes(a.id));
                setFetchedAuctions(matched);
            })
            .catch(() => { });
    }, [watchedIds]);

    const watched = [
        ...storeAuctions.filter(a => watchedIds.includes(a.id)),
        ...fetchedAuctions.filter(fa => !storeAuctions.find(sa => sa.id === fa.id)),
    ];

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>Watched Auctions</h2>
            {watched.length === 0 ? (
                <GlassCard>
                    <div className={styles.empty}>
                        <span>☆</span>
                        <p>No watched auctions yet.</p>
                        <button className={styles.browseBtn} onClick={() => navigate('/auctions')}>
                            Browse Auctions
                        </button>
                    </div>
                </GlassCard>
            ) : (
                <div className={styles.list}>
                    {watched.map((a) => (
                        <GlassCard key={a.id} className={styles.card} onClick={() => navigate(`/auctions/${a.id}`)}>
                            <img src={a.productImage} alt={a.productName} className={styles.img} referrerPolicy="no-referrer" />
                            <div className={styles.info}>
                                <span className={styles.brand}>{a.productBrand}</span>
                                <span className={styles.name}>{a.productName}</span>
                                <span className={styles.meta}>{a.colorway} · Size {a.size}</span>
                            </div>
                            <div className={styles.right}>
                                <span className={styles.price}>${a.currentPrice}</span>
                                <span className={styles.bids}>{a.bidCount} bids</span>
                                <CountdownTimer endsAt={a.endsAt} size="sm" />
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
};