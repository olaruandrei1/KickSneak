import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PriceHistoryPoint } from '../../../types/product';
import { useThemeStore } from '../../../store/themeStore';
import styles from './PriceChart.module.css';

interface PriceChartProps {
    data: PriceHistoryPoint[];
    currentPrice: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className={styles.tooltip}>
            <span className={styles.tooltipDate}>{label}</span>
            <span className={styles.tooltipPrice}>${payload[0].value}</span>
        </div>
    );
};

export const PriceChart = ({ data, currentPrice }: PriceChartProps) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const color = isDark ? '#408A71' : '#7286D3';
    const gridColor = isDark ? 'rgba(176,228,204,0.08)' : 'rgba(114,134,211,0.12)';
    const textColor = isDark ? '#408A71' : '#8EA7E9';

    const min = Math.min(...data.map((d) => d.price));
    const max = Math.max(...data.map((d) => d.price));

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <span className={styles.label}>Price History</span>
                <div className={styles.meta}>
                    <span className={styles.metaItem}>Low: <strong>${min}</strong></span>
                    <span className={styles.metaItem}>High: <strong>${max}</strong></span>
                    <span className={styles.metaItem}>Current: <strong>${currentPrice}</strong></span>
                </div>
            </div>

            <div className={styles.chart}>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: textColor, fontSize: 11, fontFamily: 'DM Sans' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: textColor, fontSize: 11, fontFamily: 'DM Sans' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="price"
                            stroke={color}
                            strokeWidth={2.5}
                            fill="url(#priceGrad)"
                            dot={{ fill: color, r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: color, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};