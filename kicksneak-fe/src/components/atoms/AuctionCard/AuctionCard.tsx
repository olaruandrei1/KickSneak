// src/components/atoms/AuctionCard/AuctionCard.tsx
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import CountdownTimer from '../CountdownTimer/CountdownTimer';
import type { AuctionListItem } from '../../../types/auction';
import styles from './AuctionCard.module.css';
import { useAuctionStore } from '../../../store/auctionStore';

interface AuctionCardProps {
    auction: AuctionListItem;
    mode?: 'grid' | 'list';
}

const AuctionCard = ({ auction, mode = 'grid' }: AuctionCardProps) => {
    const navigate = useNavigate();
    const watchedIds = useAuctionStore((s) => s.watchedAuctionIds);
    const toggleWatch = useAuctionStore((s) => s.toggleWatch);
    const isWatching = watchedIds.includes(auction.id);

    const [pulse, setPulse] = useState(false);
    const [prevPrice, setPrevPrice] = useState(auction.currentPrice);

    useEffect(() => {
        if (auction.currentPrice !== prevPrice) {
            setPulse(true);
            setPrevPrice(auction.currentPrice);
            const t = setTimeout(() => setPulse(false), 800);
            return () => clearTimeout(t);
        }
    }, [auction.currentPrice, prevPrice]);

    const handleClick = () => navigate(`/auctions/${auction.id}`);

    const handleWatch = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleWatch(auction.id);
    };

    return (
        <article
            className={`${styles.card} ${styles[`mode-${mode}`]}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
            <div className={styles.imageWrap}>
                <img
                    src={auction.productImage}
                    alt={auction.productName}
                    className={styles.image}
                    loading="lazy"
                />

                {auction.status === 'ending_soon' && (
                    <span className={styles.badgeEndingSoon}>Ending Soon</span>
                )}

                {auction.hasReserve && (
                    <span
                        className={`${styles.reserveBadge} ${auction.reserveMet ? styles.reserveMet : styles.reserveNotMet
                            }`}
                    >
                        {auction.reserveMet ? 'Reserve Met' : 'Reserve Not Met'}
                    </span>
                )}

                <button
                    type="button"
                    className={`${styles.watchBtn} ${isWatching ? styles.watchActive : ''}`}
                    onClick={handleWatch}
                    aria-label={isWatching ? 'Unwatch auction' : 'Watch auction'}
                >
                    {isWatching ? '★' : '☆'}
                </button>
            </div>

            <div className={styles.body}>
                <span className={styles.brand}>{auction.productBrand}</span>
                <h3 className={styles.name}>{auction.productName}</h3>
                <span className={styles.colorway}>
                    {auction.colorway} · Size {auction.size} {auction.sizeSystem}
                </span>

                <div className={styles.priceRow}>
                    <div className={styles.priceCol}>
                        <span className={styles.priceLabel}>Current Bid</span>
                        <span className={`${styles.price} ${pulse ? styles.pricePulse : ''}`}>
                            ${auction.currentPrice}
                        </span>
                    </div>
                    <div className={styles.metaCol}>
                        <span className={styles.bidCount}>
                            {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
                        </span>
                        <CountdownTimer endsAt={auction.endsAt} size="sm" />
                    </div>
                </div>
            </div>
        </article>
    );
};

export default AuctionCard;