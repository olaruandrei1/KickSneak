import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, EmojiEvents } from '@mui/icons-material';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import { GlassCard } from './GlassCard';
import CountdownTimer from '../../../../components/atoms/CountdownTimer/CountdownTimer';
import styles from './MyAuctionsSection.module.css';

interface MyBid {
    auctionId: string;
    productName: string;
    productImage: string;
    myBidAmount: number;
    currentPrice: number;
    isWinning: boolean;
    endsAt: string;
    status: string;
    bidPlacedAt: string;
}

interface WonAuction {
    auctionId: string;
    productName: string;
    productImage: string;
    finalPrice: number;
    wonAt: string;
    checkoutCompleted: boolean;
}

type Tab = 'bids' | 'won';

export const MyAuctionsSection = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('bids');
    const [bids, setBids] = useState<MyBid[]>([]);
    const [won, setWon] = useState<WonAuction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            httpClient.get<{ items: MyBid[] }>(ApiRoutes.auctionMyBids),
            httpClient.get<{ items: WonAuction[] }>(ApiRoutes.auctionMyWon),
        ]).then(([b, w]) => {
            setBids(b.data.items);
            setWon(w.data.items);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 24 }}>Loading...</p>;

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>My Auctions</h2>

            <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'bids' ? styles.tabActive : ''}`}
                    onClick={() => setTab('bids')}>
                    <Gavel sx={{ fontSize: 16 }} /> My Bids ({bids.length})
                </button>
                <button className={`${styles.tab} ${tab === 'won' ? styles.tabActive : ''}`}
                    onClick={() => setTab('won')}>
                    <EmojiEvents sx={{ fontSize: 16 }} /> Won ({won.length})
                </button>
            </div>

            {tab === 'bids' && (
                bids.length === 0 ? (
                    <GlassCard>
                        <div className={styles.empty}>
                            <Gavel sx={{ fontSize: 32, color: 'var(--color-text-muted)' }} />
                            <p>No active bids yet.</p>
                            <button className={styles.browseBtn} onClick={() => navigate('/auctions')}>
                                Browse Auctions
                            </button>
                        </div>
                    </GlassCard>
                ) : (
                    <div className={styles.list}>
                        {bids.map(b => (
                            <GlassCard key={b.auctionId} className={styles.card}
                                onClick={() => navigate(`/auctions/${b.auctionId}`)}>
                                <img src={b.productImage} alt={b.productName}
                                    className={styles.img} referrerPolicy="no-referrer" />
                                <div className={styles.info}>
                                    <span className={styles.name}>{b.productName}</span>
                                    <span className={styles.meta}>
                                        Bid placed {new Date(b.bidPlacedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className={styles.right}>
                                    <span className={styles.price}>${b.currentPrice}</span>
                                    <span className={`${styles.bidStatus} ${b.isWinning ? styles.winning : styles.outbid}`}>
                                        {b.isWinning ? 'Winning' : 'Outbid'}
                                    </span>
                                    <span className={styles.myBid}>Your bid: ${b.myBidAmount}</span>
                                    {b.status === 'active' && <CountdownTimer endsAt={b.endsAt} size="sm" />}
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )
            )}

            {tab === 'won' && (
                won.length === 0 ? (
                    <GlassCard>
                        <div className={styles.empty}>
                            <EmojiEvents sx={{ fontSize: 32, color: 'var(--color-text-muted)' }} />
                            <p>No auctions won yet.</p>
                            <button className={styles.browseBtn} onClick={() => navigate('/auctions')}>
                                Browse Auctions
                            </button>
                        </div>
                    </GlassCard>
                ) : (
                    <div className={styles.list}>
                        {won.map(w => (
                            <GlassCard key={w.auctionId} className={styles.card}
                                onClick={() => navigate(`/auctions/${w.auctionId}`)}>
                                <img src={w.productImage} alt={w.productName}
                                    className={styles.img} referrerPolicy="no-referrer" />
                                <div className={styles.info}>
                                    <span className={styles.name}>{w.productName}</span>
                                    <span className={styles.meta}>
                                        Won {new Date(w.wonAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className={styles.right}>
                                    <span className={styles.price}>${w.finalPrice}</span>
                                    <span className={`${styles.bidStatus} ${w.checkoutCompleted ? styles.winning : styles.pendingPay}`}>
                                        {w.checkoutCompleted ? 'Paid' : 'Payment Pending'}
                                    </span>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};