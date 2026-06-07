import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, MenuItem, Select, FormControl, InputLabel, TextField, Button, CircularProgress } from '@mui/material';
import { ShoppingBag, Favorite, TrendingUp, LocalShipping, Save } from '@mui/icons-material';
import type { Order } from '../../../../types/profile';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import { GlassCard } from './GlassCard';
import styles from './OverviewSection.module.css';

interface UserProfileDto {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    isSeller: boolean;
    joinedAt: string;
    totalSpent: number;
    totalOrders: number;
    genderId?: string;
    birthDate?: string;
    seller?: {
        storeName: string;
        totalSales: number;
        rating: number;
        verified: boolean;
    };
}

interface GenderDto {
    id: string;
    name?: string;
}

const STATUS_COLOR: Record<string, string> = {
    delivered: '#22c55e',
    shipped: 'var(--color-accent)',
    pending: '#f59e0b',
    returned: '#ef4444',
    cancelled: 'var(--color-text-muted)',
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
    '& input': { color: 'var(--color-text)', fontSize: '0.85rem' },
};

export const OverviewSection = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [profile, setProfile] = useState<UserProfileDto | null>(null);
    const [genders, setGenders] = useState<GenderDto[]>([]);
    const [form, setForm] = useState<{ genderId: string; birthDate: string }>({ genderId: '', birthDate: '' });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        httpClient.get<UserProfileDto>(ApiRoutes.profileMe())
            .then((r) => {
                setProfile(r.data);
                setForm({
                    genderId: r.data.genderId ?? '',
                    birthDate: r.data.birthDate ? r.data.birthDate.split('T')[0] : '',
                });
            });

        httpClient.get<GenderDto[]>(ApiRoutes.profileGenders())
            .then((r) => setGenders(r.data));

        httpClient.get<{ items: Order[] }>(ApiRoutes.orders)
            .then((r) => setOrders(r.data.items.slice(0, 3)))
            .catch(() => setOrders([]));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await httpClient.put(ApiRoutes.profileMe(), {
                firstName: profile?.displayName?.split(' ')[0],
                lastName: profile?.displayName?.split(' ').slice(1).join(' '),
                genderId: form.genderId || null,
                birthDate: form.birthDate || null,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    const stats = [
        { icon: <ShoppingBag sx={{ fontSize: 22 }} />, label: 'Total Orders', value: profile?.totalOrders ?? 0, color: 'var(--color-secondary)' },
        { icon: <TrendingUp sx={{ fontSize: 22 }} />, label: 'Total Spent', value: `$${(profile?.totalSpent ?? 0).toFixed(2)}`, color: '#a78bfa' },
        { icon: <LocalShipping sx={{ fontSize: 22 }} />, label: 'Delivered', value: orders.filter((o) => o.status === 'delivered').length, color: '#22c55e' },
        { icon: <Favorite sx={{ fontSize: 22 }} />, label: 'Member Since', value: profile ? new Date(profile.joinedAt).getFullYear() : '—', color: '#f472b6' },
    ];

    return (
        <div className={styles.wrapper}>
            <Typography variant="h5" className={styles.title}>
                Welcome back, {profile?.displayName?.split(' ')[0] ?? 'there'} 👋
            </Typography>

            <div className={styles.statsGrid}>
                {stats.map((s) => (
                    <GlassCard key={s.label} className={styles.statCard}>
                        <span className={styles.statIcon} style={{ color: s.color, background: `${s.color}18` }}>
                            {s.icon}
                        </span>
                        <span className={styles.statValue}>{s.value}</span>
                        <span className={styles.statLabel}>{s.label}</span>
                    </GlassCard>
                ))}
            </div>

            {/* Personal Info */}
            <GlassCard>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>Personal Info</span>
                    <Button
                        startIcon={<Save sx={{ fontSize: 14 }} />}
                        variant="contained"
                        size="small"
                        onClick={handleSave}
                        disabled={saving}
                        sx={{
                            background: saved ? '#22c55e' : 'var(--color-secondary)',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.75rem',
                            borderRadius: '100px',
                            transition: 'background 0.3s',
                            '&:hover': { background: 'var(--color-primary)' },
                        }}
                    >
                        {saved ? 'Saved!' : saving ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : 'Save'}
                    </Button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <FormControl size="small" sx={sxField}>
                        <InputLabel>Gender</InputLabel>
                        <Select
                            value={form.genderId}
                            label="Gender"
                            onChange={(e) => setForm((f) => ({ ...f, genderId: e.target.value }))}
                            sx={{ color: 'var(--color-text)' }}
                            MenuProps={{
                                sx: {
                                    '& .MuiPaper-root': {
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-text)',
                                    },
                                    '& .MuiMenuItem-root:hover': {
                                        background: 'var(--color-primary)',
                                    },
                                },
                            }}
                        >
                            <MenuItem value="">— Not specified —</MenuItem>
                            {genders.map((g) => (
                                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Birth Date"
                        type="date"
                        size="small"
                        value={form.birthDate}
                        onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={sxField}
                    />
                </div>
            </GlassCard>

            {/* Recent Orders */}
            <GlassCard noPadding>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>Recent Orders</span>
                    <button className={styles.seeAll} onClick={() => navigate('?section=orders')}>See all →</button>
                </div>
                <div className={styles.orderList}>
                    {orders.length === 0 ? (
                        <div className={styles.emptyOrders}>
                            <ShoppingBag sx={{ fontSize: 32, color: 'var(--color-text-muted)', opacity: 0.4 }} />
                            <span>No orders yet</span>
                        </div>
                    ) : orders.map((order) => (
                        <div key={order.id} className={styles.orderRow}>
                            <img src={order.items[0]?.image} alt={order.items[0]?.name} className={styles.orderImg} />
                            <div className={styles.orderInfo}>
                                <span className={styles.orderName}>{order.items[0]?.name}</span>
                                <span className={styles.orderDate}>{new Date(order.date).toLocaleDateString('en-GB')}</span>
                            </div>
                            <span className={styles.orderTotal}>${order.total}</span>
                            <span className={styles.orderStatus} style={{
                                color: STATUS_COLOR[order.status],
                                background: `${STATUS_COLOR[order.status]}18`,
                            }}>
                                {order.status}
                            </span>
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* Seller Overview */}
            {profile?.isSeller && profile?.seller && (
                <GlassCard>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Seller Overview</span>
                        <button className={styles.seeAll} onClick={() => navigate('?section=seller-sales')}>
                            Full stats →
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
                        {[
                            { label: 'Total Sales', value: profile.seller.totalSales },
                            { label: 'Rating', value: `⭐ ${profile.seller.rating.toFixed(1)}` },
                            { label: 'Store', value: profile.seller.storeName },
                        ].map((s) => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '1.1rem' }}>{s.value}</div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}
        </div>
    );
};