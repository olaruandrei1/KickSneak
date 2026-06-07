import { useEffect, useState } from 'react';
import { Button, Chip, TextField } from '@mui/material';
import { LocalShipping, CheckCircle, Cancel, Refresh, HourglassEmpty } from '@mui/icons-material';
import type { Order, OrderDto } from '../../../../types/profile';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import { GlassCard } from './GlassCard';
import styles from './OrdersSections.module.css';
import { AppModal } from '../../../../components/molecules/AppModal/AppModal';
import { useSearchParams } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
    pending: { label: 'Pending', color: '#f59e0b', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
    confirmed: { label: 'Confirmed', color: '#22c55e', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
    shipped: { label: 'Shipped', color: 'var(--color-accent)', icon: <LocalShipping sx={{ fontSize: 14 }} /> },
    delivered: { label: 'Delivered', color: '#22c55e', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
    cancelled: { label: 'Cancelled', color: 'var(--color-text-muted)', icon: <Cancel sx={{ fontSize: 14 }} /> },
    refunded: { label: 'Refunded', color: '#a78bfa', icon: <Refresh sx={{ fontSize: 14 }} /> },
};

export const OrdersSection = () => {
    const [orders, setOrders] = useState<OrderDto[]>([]);

    const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    const [reviewModalOrderId, setReviewModalOrderId] = useState<string | null>(null);
    const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());
    const [score, setScore] = useState(5);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);


    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        httpClient.get<{ items: OrderDto[] }>(ApiRoutes.orders)
            .then(async (r) => {
                setOrders(r.data.items);

                const delivered = r.data.items.filter(o => o.status === 'delivered');
                const checks = await Promise.all(
                    delivered.map(o =>
                        httpClient.get<boolean>(ApiRoutes.hasReview(o.id))
                            .then(res => res.data ? o.id : null)
                            .catch(() => null)
                    )
                );
                setReviewedOrderIds(new Set(checks.filter(Boolean) as string[]));

                const reviewOrderId = searchParams.get('review');
                if (reviewOrderId) {
                    setReviewModalOrderId(reviewOrderId);
                    setSearchParams({});
                }
            });
    }, []);

    const handleCancel = async () => {
        if (!cancelModalOrderId) return;
        setCancelling(true);
        try {
            await httpClient.post(ApiRoutes.cancelOrder(cancelModalOrderId));
            setOrders((prev) => prev.map((o) =>
                o.id === cancelModalOrderId ? { ...o, status: 'cancelled' } : o
            ));
            setCancelModalOrderId(null);
        } finally {
            setCancelling(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!reviewModalOrderId) return;
        setSubmittingReview(true);
        try {
            await httpClient.post(ApiRoutes.reviews(), {
                orderId: reviewModalOrderId,
                score,
                title: reviewTitle || null,
                comment: reviewComment || null,
            });
            setReviewedOrderIds((prev) => new Set([...prev, reviewModalOrderId]));
            setReviewModalOrderId(null);
            setScore(5);
            setReviewTitle('');
            setReviewComment('');
        } finally {
            setSubmittingReview(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>My Orders</h2>

            <div className={styles.list}>
                {orders.map((order) => {
                    const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['pending'];
                    return (
                        <GlassCard key={order.id} noPadding>
                            <div className={styles.orderHeader}>
                                <div className={styles.orderMeta}>
                                    <span className={styles.orderId}>#{order.id.toUpperCase()}</span>
                                    <span className={styles.orderDate}>
                                        {new Date(order.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <Chip
                                    label={cfg.label}
                                    size="small"
                                    icon={cfg.icon}
                                    sx={{
                                        background: `${cfg.color}18`,
                                        color: cfg.color,
                                        border: `1px solid ${cfg.color}40`,
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        '& .MuiChip-icon': { color: cfg.color },
                                    }}
                                />
                            </div>

                            {order.items.map((item) => (
                                <div key={item.name} className={styles.itemRow}>
                                    <img src={item.image} alt={item.name} className={styles.itemImg} />
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemBrand}>{item.brand}</span>
                                        <span className={styles.itemName}>{item.name}</span>
                                        <span className={styles.itemSize}>Size: {item.size}</span>
                                    </div>
                                    <span className={styles.itemPrice}>${item.price}</span>
                                </div>
                            ))}

                            <div className={styles.orderFooter}>
                                <div className={styles.trackingWrap}>
                                    <LocalShipping sx={{ fontSize: 14, color: 'var(--color-text-muted)' }} />
                                    <span className={styles.tracking}>{order.tracking}</span>
                                </div>
                                <div className={styles.footerRight}>
                                    <div className={styles.totalWrap}>
                                        <span className={styles.totalLabel}>Total</span>
                                        <span className={styles.totalValue}>${order.total}</span>
                                    </div>
                                    {(order.status === 'pending' || order.status === 'confirmed') && (
                                        <button className={styles.cancelBtn} onClick={() => setCancelModalOrderId(order.id)}>
                                            Cancel Order
                                        </button>
                                    )}
                                    {order.status === 'delivered' && !reviewedOrderIds.has(order.id) && (
                                        <button className={styles.reviewBtn} onClick={() => setReviewModalOrderId(order.id)}>
                                            ⭐ Leave Review
                                        </button>
                                    )}
                                    {order.status === 'delivered' && reviewedOrderIds.has(order.id) && (
                                        <span className={styles.reviewedBadge}>✓ Reviewed</span>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
            <AppModal
                open={!!cancelModalOrderId}
                onClose={() => setCancelModalOrderId(null)}
                title="Cancel Order"
                maxWidth="xs"
            >
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
                    Are you sure you want to cancel this order? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button
                        variant="outlined"
                        onClick={() => setCancelModalOrderId(null)}
                        sx={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', borderRadius: '100px', fontFamily: 'var(--font-display)' }}
                    >
                        Keep Order
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCancel}
                        disabled={cancelling}
                        sx={{ background: '#ef4444', fontFamily: 'var(--font-display)', fontWeight: 700, borderRadius: '100px', '&:hover': { background: '#dc2626' } }}
                    >
                        {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                    </Button>
                </div>
            </AppModal>

            <AppModal
                open={!!reviewModalOrderId}
                onClose={() => setReviewModalOrderId(null)}
                title="Leave a Review"
                maxWidth="sm"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Star rating */}
                    <div>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                            RATING
                        </span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setScore(s)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.8rem',
                                        color: s <= score ? '#f59e0b' : 'var(--color-border)',
                                        transition: 'color 0.15s ease',
                                        padding: '0 2px',
                                    }}
                                >
                                    ★
                                </button>
                            ))}
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', alignSelf: 'center', marginLeft: '8px' }}>
                                {score}/5
                            </span>
                        </div>
                    </div>

                    <TextField
                        label="Title (optional)"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        size="small"
                        fullWidth
                        sx={sxField}
                    />

                    <TextField
                        label="Comment (optional)"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        multiline
                        rows={3}
                        size="small"
                        fullWidth
                        sx={sxField}
                        placeholder="Share your experience..."
                    />

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <Button
                            variant="outlined"
                            onClick={() => setReviewModalOrderId(null)}
                            sx={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', borderRadius: '100px', fontFamily: 'var(--font-display)' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSubmitReview}
                            disabled={submittingReview}
                            sx={{ background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', fontWeight: 700, borderRadius: '100px', '&:hover': { background: 'var(--color-primary)' } }}
                        >
                            {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </Button>
                    </div>
                </div>
            </AppModal>
        </div>
    );
};

const sxField = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '10px',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        '& fieldset': { borderColor: 'var(--color-border)' },
        '&:hover fieldset': { borderColor: 'var(--color-secondary)' },
        '&.Mui-focused fieldset': { borderColor: 'var(--color-accent)' },
    },
    '& .MuiInputLabel-root': { color: 'var(--color-text-muted)', fontSize: '0.85rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-accent)' },
    '& input, & textarea': { color: 'var(--color-text)', fontSize: '0.85rem' },
};