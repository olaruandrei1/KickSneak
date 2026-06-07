import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { Visibility, Gavel, AutoMode, Star, StarBorder, VerifiedUser } from '@mui/icons-material';
import { cachedFetch } from '../../services/cachedFetchService';
import { ApiRoutes } from '../../services/apiRoutes';
import { useAuctionStore } from '../../store/auctionStore';
import { useAuthStore } from '../../store/authStore';
import { useAuctionLiveSync } from '../../hooks/useAuctionLiveSync';
import CountdownTimer from '../../components/atoms/CountdownTimer/CountdownTimer';
import { Spinner } from '../../components/atoms/Spinner/Spinner';
import type { AuctionDetail, PlaceBidResponse } from '../../types/auction';
import { httpClient } from '../../services/axiosService';
import styles from './AuctionDetailPage.module.css';

const CONDITION_LABEL: Record<string, string> = {
    new: 'New',
    used_excellent: 'Used — Excellent',
    used_good: 'Used — Good',
    used_fair: 'Used — Fair',
};

const AuctionDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const currentAuction = useAuctionStore((s) => s.currentAuction);
    const setCurrentAuction = useAuctionStore((s) => s.setCurrentAuction);
    const isLoadingDetail = useAuctionStore((s) => s.isLoadingDetail);
    const setLoadingDetail = useAuctionStore((s) => s.setLoadingDetail);
    const watchedIds = useAuctionStore((s) => s.watchedAuctionIds);
    const toggleWatch = useAuctionStore((s) => s.toggleWatch);
    const myAutoBids = useAuctionStore((s) => s.myAutoBids);
    const setAutoBid = useAuctionStore((s) => s.setAutoBid);
    const cancelAutoBid = useAuctionStore((s) => s.cancelAutoBid);
    const upsertMyBid = useAuctionStore((s) => s.upsertMyBid);
    const recentlyOutbidIds = useAuctionStore((s) => s.recentlyOutbidIds);
    const clearOutbid = useAuctionStore((s) => s.clearOutbid);

    const [selectedImg, setSelectedImg] = useState(0);
    const [bidOpen, setBidOpen] = useState(false);
    const [autoBidOpen, setAutoBidOpen] = useState(false);
    const [bidAmount, setBidAmount] = useState('');
    const [autoBidAmount, setAutoBidAmount] = useState('');
    const [bidError, setBidError] = useState('');
    const [bidSuccess, setBidSuccess] = useState(false);

    const isWatching = id ? watchedIds.includes(id) : false;

    const myAutoBid = id ? myAutoBids[id] : undefined;
    const auction = currentAuction?.id === id ? currentAuction : null;
    const isOutbid = (() => {
        if (!id || !user || !auction) return false;
        if (auction.recentBids.length === 0) return false;

        const myBid = auction.recentBids.find(b => b.bidderId === user.uid);
        if (!myBid) return false;

        if (auction.recentBids[0]?.bidderId === user.uid) return false;

        return true;
    })();

    const autoBidWorking = (() => {
        if (!id || !user || !auction || !myAutoBid) return false;
        const latest = auction.recentBids[0];
        return latest?.bidderId === user.uid && latest?.isAutoBid;
    })();

    const isWinning = (() => {
        if (!user || !auction) return false;
        if (auction.recentBids.length === 0) return false;
        return auction.recentBids[0]?.bidderId === user.uid;
    })();

    const [guestOpen, setGuestOpen] = useState(false);

    useAuctionLiveSync({ auctionId: id, currentUserId: user?.uid });

    useEffect(() => {
        if (!id) return;
        setLoadingDetail(true);
        setCurrentAuction(null);

        cachedFetch<AuctionDetail>({
            key: `auction-detail-${id}`,
            url: ApiRoutes.auctionDetail(id),
            onData: (data) => {
                setCurrentAuction(data);
                setLoadingDetail(false);
                setBidAmount(String(data.currentPrice + 1));
            },
        }).catch(() => {
            setLoadingDetail(false);
        }).finally(() => {
            setLoadingDetail(false);
        });

        return () => setCurrentAuction(null);
    }, [id]);

    const handlePlaceBid = async () => {
        if (!auction || !id) return;

        const amount = Number(bidAmount);

        try {
            const fresh = await httpClient.get<AuctionDetail>(ApiRoutes.auctionDetail(id));
            const livePrice = fresh.data.currentPrice;

            if (amount <= livePrice) {
                setBidError(`Bid must be higher than $${livePrice}. Price updated.`);
                setBidAmount(String(livePrice + 1));
                setCurrentAuction({ ...auction, currentPrice: livePrice, bidCount: fresh.data.bidCount });
                return;
            }
        } catch { }

        if (amount <= auction.currentPrice) {
            setBidError(`Bid must be higher than $${auction.currentPrice}`);
            return;
        }

        try {
            const res = await httpClient.post<PlaceBidResponse>(ApiRoutes.placeBid(id), { amount });
            const data = res.data;
            if (data.success) {
                setBidSuccess(true);
                upsertMyBid({
                    auctionId: id,
                    productName: auction.product.name,
                    productImage: auction.product.images[0],
                    myBidAmount: amount,
                    currentPrice: data.newCurrentPrice,
                    isWinning: true,
                    status: auction.status,
                    endsAt: data.newEndsAt?.toString() ?? auction.endsAt,
                    bidPlacedAt: new Date().toISOString(),
                });
                if (isOutbid) clearOutbid(id);
                setTimeout(() => { setBidOpen(false); setBidSuccess(false); }, 1500);
            } else {
                setBidError(`Failed: ${data.errorReason ?? 'Unknown error'}`);
            }
        } catch {
            setBidError('Something went wrong. Please try again.');
        }
    };

    const handleSetAutoBid = async () => {
        if (!auction || !id || !user)
            return;

        const max = Number(autoBidAmount);

        if (max <= auction.currentPrice)
            return;

        try {
            const res = await httpClient.post(ApiRoutes.setAutoBid(id), { maxAmount: max });
            const data = res.data;

            setAutoBid({
                id: data.id,
                auctionId: id,
                userId: user.uid,
                maxAmount: max,
                currentBidPlaced: data.currentBidPlaced ?? 0,
                isActive: true,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            });
            setAutoBidOpen(false);
        } catch {
        }
    };

    if (isLoadingDetail) return <Spinner fullPage size="lg" />;
    if (!auction) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                Auction not found
            </span>
            <button
                onClick={() => navigate('/auctions')}
                style={{ background: 'var(--color-secondary)', color: 'var(--color-bg)', border: 'none', borderRadius: '100px', padding: '10px 24px', fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer' }}
            >
                Back to Auctions
            </button>
        </div>
    );
    const { product, seller } = auction;
    const ended = auction.status === 'ended' || auction.status === 'cancelled';

    return (
        <div className={styles.page}>
            <div className={styles.inner}>

                {/* ── Left: images ── */}
                <div className={styles.imageCol}>
                    <div className={styles.mainImageWrap}>
                        <img
                            src={product.images[selectedImg]}
                            alt={product.name}
                            className={styles.mainImage}
                        />
                        {auction.status === 'ending_soon' && (
                            <span className={styles.badgeEndingSoon}>Ending Soon</span>
                        )}
                        {ended && <span className={styles.badgeEnded}>Ended</span>}
                    </div>
                    {product.images.length > 1 && (
                        <div className={styles.thumbRow}>
                            {product.images.map((img, i) => (
                                <button
                                    key={i}
                                    className={`${styles.thumb} ${selectedImg === i ? styles.thumbActive : ''}`}
                                    onClick={() => setSelectedImg(i)}
                                >
                                    <img src={img} alt="" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right: info ── */}
                <div className={styles.infoCol}>

                    {/* Header */}
                    <div className={styles.header}>
                        <div>
                            <span className={styles.brand}>{product.brand}</span>
                            <h1 className={styles.name}>{product.name}</h1>
                            <span className={styles.colorway}>{product.colorway} · Size {product.size} {product.sizeSystem}</span>
                        </div>
                        <button
                            className={`${styles.watchBtn} ${isWatching ? styles.watchActive : ''}`}
                            onClick={() => id && toggleWatch(id)}
                        >
                            {isWatching ? <Star sx={{ fontSize: 22 }} /> : <StarBorder sx={{ fontSize: 22 }} />}
                        </button>
                    </div>

                    {/* Stats row */}
                    <div className={styles.statsRow}>
                        <Chip label={CONDITION_LABEL[product.condition] ?? product.condition} size="small"
                            sx={{ background: 'rgba(64,138,113,0.12)', color: 'var(--color-accent)', fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700 }} />
                        <span className={styles.stat}><Visibility sx={{ fontSize: 14 }} />{auction.views} views</span>
                        <span className={styles.stat}><Gavel sx={{ fontSize: 14 }} />{auction.bidCount} bids</span>
                        <span className={styles.stat}><StarBorder sx={{ fontSize: 14 }} />{auction.watchers} watching</span>
                    </div>

                    {(isOutbid || autoBidWorking) && (
                        <div className={autoBidWorking ? styles.outbidCovered : styles.outbidBanner}>
                            {autoBidWorking
                                ? '🛡️ Your auto-bid kicked in and you\'re back in the lead.'
                                : '⚡ You\'ve been outbid! Place a higher bid to stay in the lead.'}
                        </div>
                    )}

                    {/* Price + countdown */}
                    <div className={styles.priceBlock}>
                        <div className={styles.priceRow}>
                            <div>
                                <span className={styles.priceLabel}>Current Bid</span>
                                <span className={styles.price}>${auction.currentPrice.toLocaleString()}</span>
                            </div>
                            <div className={styles.countdownWrap}>
                                <span className={styles.priceLabel}>Time Left</span>
                                <CountdownTimer endsAt={auction.endsAt} size="lg" />
                            </div>
                        </div>
                        {auction.reservePrice && (
                            <span className={`${styles.reserveNote} ${auction.reserveMet ? styles.reserveOk : ''}`}>
                                {auction.reserveMet ? '✓ Reserve price met' : '⚠ Reserve price not yet met'}
                            </span>
                        )}
                        {auction.highestBidderUsername && (
                            <span className={styles.highestBidder}>
                                Highest bidder: <strong>{auction.highestBidderUsername}</strong>
                            </span>
                        )}
                    </div>

                    {/* Auto bid indicator */}
                    {myAutoBid && (
                        <div className={styles.autoBidBanner}>
                            <AutoMode sx={{ fontSize: 16 }} />
                            Auto-bid active up to <strong>${myAutoBid.maxAmount}</strong>
                            <button className={styles.cancelAutoBid} onClick={async () => {
                                if (!id)
                                    return;
                                try {
                                    await httpClient.delete(ApiRoutes.cancelAutoBid(id));
                                    cancelAutoBid(id);
                                } catch { }
                            }}>
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* CTA buttons */}
                    {!ended && (
                        <div className={styles.ctaRow}>
                            <button
                                className={`${styles.bidBtn} ${isWinning ? styles.bidBtnWinning : ''}`}
                                disabled={isWinning}
                                onClick={() => {
                                    if (!user) { setGuestOpen(true); return; }
                                    setBidError(''); setBidAmount(String(auction.currentPrice + 1)); setBidOpen(true);
                                }}
                            >
                                <Gavel sx={{ fontSize: 18 }} />
                                {isWinning ? 'You\'re Winning!' : 'Place Bid'}
                            </button>
                            {!myAutoBid && !isWinning && (
                                <button className={styles.autoBidBtn} onClick={() => {
                                    if (!user) { setGuestOpen(true); return; }
                                    setAutoBidOpen(true);
                                }}>
                                    <AutoMode sx={{ fontSize: 18 }} />
                                    Auto Bid
                                </button>
                            )}
                        </div>
                    )}

                    {/* Seller */}
                    <div className={styles.sellerCard}>
                        <div className={styles.sellerAvatar}>
                            {seller.avatarUrl
                                ? <img src={seller.avatarUrl} alt={seller.username} />
                                : <span>{seller.username[0].toUpperCase()}</span>
                            }
                        </div>
                        <div className={styles.sellerInfo}>
                            <span className={styles.sellerName}>
                                {seller.username}
                                {seller.isVerified && <VerifiedUser sx={{ fontSize: 14, color: 'var(--color-accent)', ml: 0.5 }} />}
                            </span>
                            <span className={styles.sellerMeta}>⭐ {seller.rating} · {seller.totalSales} sales</span>
                        </div>
                    </div>

                    {/* Recent bids */}
                    {auction.recentBids.length > 0 && (
                        <div className={styles.bidsSection}>
                            <span className={styles.bidsTitle}>Recent Bids</span>
                            <div className={styles.bidsList}>
                                {auction.recentBids.slice(0, 5).map((bid) => (
                                    <div key={bid.id} className={styles.bidRow}>
                                        <span className={styles.bidder}>{bid.bidderUsername}</span>
                                        {bid.isAutoBid && <Chip label="Auto" size="small" sx={{ height: 16, fontSize: '0.55rem', fontFamily: 'var(--font-display)' }} />}
                                        <span className={styles.bidAmount}>${bid.amount}</span>
                                        <span className={styles.bidTime}>{new Date(bid.placedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Place Bid Modal */}
            <Dialog open={bidOpen} onClose={() => setBidOpen(false)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '16px' } } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontWeight: 700 }}>
                    Place Bid — {product.name}
                </DialogTitle>
                <DialogContent>
                    {bidSuccess ? (
                        <div style={{ textAlign: 'center', padding: '16px 0', color: '#22c55e', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                            ✓ Bid placed successfully!
                        </div>
                    ) : (
                        <>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                                Current bid: <strong style={{ color: 'var(--color-text)' }}>${auction.currentPrice}</strong>. Your bid must be higher.
                            </p>
                            <TextField
                                label="Your Bid ($)" type="number" value={bidAmount}
                                onChange={(e) => { setBidAmount(e.target.value); setBidError(''); }}
                                size="small" fullWidth autoFocus
                                error={!!bidError} helperText={bidError}
                                sx={sxField}
                            />
                        </>
                    )}
                </DialogContent>
                {!bidSuccess && (
                    <DialogActions sx={{ padding: '12px 24px' }}>
                        <Button onClick={() => setBidOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancel</Button>
                        <Button onClick={handlePlaceBid} variant="contained"
                            sx={{ background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', borderRadius: '100px' }}>
                            Confirm Bid
                        </Button>
                    </DialogActions>
                )}
            </Dialog>

            {/* Auto Bid Modal */}
            <Dialog open={autoBidOpen} onClose={() => setAutoBidOpen(false)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '16px' } } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontWeight: 700 }}>
                    Set Auto Bid
                </DialogTitle>
                <DialogContent>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                        We'll automatically bid for you up to your maximum. Current bid: <strong style={{ color: 'var(--color-text)' }}>${auction.currentPrice}</strong>
                    </p>
                    <TextField
                        label="Maximum Amount ($)" type="number" value={autoBidAmount}
                        onChange={(e) => setAutoBidAmount(e.target.value)}
                        size="small" fullWidth autoFocus sx={sxField}
                    />
                </DialogContent>
                <DialogActions sx={{ padding: '12px 24px' }}>
                    <Button onClick={() => setAutoBidOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancel</Button>
                    <Button onClick={handleSetAutoBid} variant="contained"
                        disabled={Number(autoBidAmount) <= auction.currentPrice}
                        sx={{ background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', borderRadius: '100px' }}>
                        Activate Auto Bid
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

const sxField = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '10px', background: 'var(--color-surface)', color: 'var(--color-text)',
        '& fieldset': { borderColor: 'var(--color-border)' },
        '&.Mui-focused fieldset': { borderColor: 'var(--color-accent)' },
    },
    '& .MuiInputLabel-root': { color: 'var(--color-text-muted)' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-accent)' },
    '& input': { color: 'var(--color-text)' },
    '& .MuiFormHelperText-root': { color: '#ef4444' },
};

export default AuctionDetailPage;