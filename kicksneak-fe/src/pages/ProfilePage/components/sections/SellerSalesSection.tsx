import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useThemeStore } from '../../../../store/themeStore';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import { GlassCard } from './GlassCard';
import type { UserProfile } from '../../../../types/profile';
import styles from './SellerSalesSection.module.css';

interface SalesData {
    totalRevenue: number; totalSales: number; avgOrderValue: number;
    chart: { month: string; revenue: number; sales: number }[];
    recentSales: { id: string; buyer: string; item: string; price: number; date: string; status: string }[];
}

interface Props {
    profile: UserProfile;
    onProfileUpdate: (p: UserProfile) => void;
}

export const SellerSalesSection = ({ profile }: Props) => {
    const [data, setData] = useState<SalesData | null>(null);
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const color = isDark ? '#408A71' : '#7286D3';
    const gridColor = isDark ? 'rgba(176,228,204,0.08)' : 'rgba(114,134,211,0.12)';
    const textColor = isDark ? '#408A71' : '#8EA7E9';

    useEffect(() => {
        httpClient.get<SalesData>(ApiRoutes.sellerSales)
            .then((r) => setData(r.data));
    }, []);

    if (!data) return null;

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>Sales History</h2>

            {/* Summary stats */}
            <div className={styles.statsGrid}>
                {[
                    { label: 'Total Revenue', value: `$${data.totalRevenue.toLocaleString()}` },
                    { label: 'Total Sales', value: data.totalSales },
                    { label: 'Avg Order Value', value: `$${data.avgOrderValue.toFixed(2)}` },
                    { label: 'Store Rating', value: `⭐ ${profile.seller?.rating ?? '—'}` },
                ].map((s) => (
                    <GlassCard key={s.label} className={styles.statCard}>
                        <span className={styles.statValue}>{s.value}</span>
                        <span className={styles.statLabel}>{s.label}</span>
                    </GlassCard>
                ))}
            </div>

            {/* Chart */}
            <GlassCard>
                <div className={styles.chartHeader}>
                    <span className={styles.chartTitle}>Revenue — Last 6 Months</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                            <linearGradient id="sellerGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: textColor, fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: 12, color: 'var(--color-text)' }} />
                        <Area type="monotone" dataKey="revenue" stroke={color} strokeWidth={2.5} fill="url(#sellerGrad)"
                            dot={{ fill: color, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: color }} />
                    </AreaChart>
                </ResponsiveContainer>
            </GlassCard>

            {/* Recent sales */}
            <GlassCard noPadding>
                <div className={styles.tableHeader}>
                    <span>Buyer</span>
                    <span>Item</span>
                    <span>Price</span>
                    <span>Date</span>
                    <span>Status</span>
                </div>
                {data.recentSales.map((s) => (
                    <div key={s.id} className={styles.tableRow}>
                        <span className={styles.buyer}>{s.buyer}</span>
                        <span className={styles.item}>{s.item}</span>
                        <span className={styles.price}>${s.price}</span>
                        <span className={styles.date}>{new Date(s.date).toLocaleDateString('en-GB')}</span>
                        <span className={styles.status}>{s.status}</span>
                    </div>
                ))}
            </GlassCard>
        </div>
    );
};