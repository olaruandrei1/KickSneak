import { useState, useEffect } from 'react';
import { TextField, MenuItem, Button, Chip } from '@mui/material';
import { Upload, Send, Add } from '@mui/icons-material';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import { GlassCard } from './GlassCard';
import styles from './ReturnsSection.module.css';
import { AppModal } from '../../../../components/molecules/AppModal/AppModal';

interface OrderDto {
    id: string;
    status: string;
    total: number;
    items: { name: string; image: string }[];
}

interface ReturnDto {
    id: string;
    orderId: string;
    orderRef: string;
    productName: string;
    productImage: string;
    reason: string;
    description?: string;
    status: string;
    createdAt: string;
}

const RETURN_REASONS = [
    'Wrong size', 'Item not as described', 'Damaged on arrival',
    'Changed my mind', 'Counterfeit concern', 'Other',
];

const STATUS_COLOR: Record<string, string> = {
    pending: '#f59e0b',
    approved: '#22c55e',
    rejected: '#ef4444',
    completed: 'var(--color-accent)',
};

export const ReturnsSection = () => {
    const [returns, setReturns] = useState<ReturnDto[]>([]);
    const [orders, setOrders] = useState<OrderDto[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState('');
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        httpClient.get<{ items: ReturnDto[] }>(ApiRoutes.returns())
            .then((r) => setReturns(r.data.items));

        httpClient.get<{ items: OrderDto[] }>(ApiRoutes.orders)
            .then((r) => setOrders(r.data.items.filter((o) => o.status === 'delivered')));
    }, []);

    const handleSubmit = async () => {
        if (!selectedOrder || !reason) return;
        setSubmitting(true);
        try {
            const res = await httpClient.post<ReturnDto>(ApiRoutes.returns(), {
                orderId: selectedOrder,
                reason,
                description: description || null,
            });
            setReturns((prev) => [res.data, ...prev]);
            setModalOpen(false);
            setSelectedOrder('');
            setReason('');
            setDescription('');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <h2 className={styles.title}>Returns</h2>
                <Button
                    startIcon={<Add />}
                    variant="outlined"
                    size="small"
                    onClick={() => setModalOpen(true)}
                    sx={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.78rem',
                        borderRadius: '100px',
                        '&:hover': { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' },
                    }}
                >
                    New Return
                </Button>
            </div>

            {returns.length === 0 ? (
                <GlassCard>
                    <div className={styles.empty}>
                        <p>No return requests yet.</p>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setModalOpen(true)}
                            sx={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', borderRadius: '100px', fontFamily: 'var(--font-display)', mt: 1 }}
                        >
                            Submit a Return
                        </Button>
                    </div>
                </GlassCard>
            ) : (
                <div className={styles.list}>
                    {returns.map((r) => (
                        <GlassCard key={r.id}>
                            <div className={styles.returnRow}>
                                <img src={r.productImage} alt={r.productName} className={styles.returnImg} />
                                <div className={styles.returnInfo}>
                                    <span className={styles.returnProduct}>{r.productName}</span>
                                    <span className={styles.returnMeta}>Order #{r.orderRef} · {r.createdAt}</span>
                                    <span className={styles.returnReason}>{r.reason}</span>
                                </div>
                                <Chip
                                    label={r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                    size="small"
                                    sx={{
                                        background: `${STATUS_COLOR[r.status] ?? '#888'}18`,
                                        color: STATUS_COLOR[r.status] ?? '#888',
                                        border: `1px solid ${STATUS_COLOR[r.status] ?? '#888'}40`,
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                    }}
                                />
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            <AppModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="New Return Request"
                maxWidth="sm"
            >
                <div className={styles.form}>
                    <TextField
                        select label="Select Order"
                        value={selectedOrder}
                        onChange={(e) => setSelectedOrder(e.target.value)}
                        size="small" fullWidth sx={sxField}
                    >
                        {orders.length === 0
                            ? <MenuItem disabled>No delivered orders</MenuItem>
                            : orders.map((o) => (
                                <MenuItem key={o.id} value={o.id} sx={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
                                    #{o.id.slice(0, 8).toUpperCase()} — {o.items[0]?.name} (${o.total})
                                </MenuItem>
                            ))
                        }
                    </TextField>

                    <TextField
                        select label="Reason for Return"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        size="small" fullWidth sx={sxField}
                    >
                        {RETURN_REASONS.map((r) => (
                            <MenuItem key={r} value={r} sx={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>{r}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline rows={3} size="small" fullWidth sx={sxField}
                        placeholder="Describe the issue in detail..."
                    />

                    <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={handleSubmit}
                        disabled={!selectedOrder || !reason || submitting}
                        fullWidth
                        sx={{
                            background: 'var(--color-secondary)',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            borderRadius: '100px',
                            py: 1.2,
                            mt: 1,
                            '&:hover': { background: 'var(--color-primary)' },
                            '&.Mui-disabled': { opacity: 0.4 },
                        }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Return Request'}
                    </Button>
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