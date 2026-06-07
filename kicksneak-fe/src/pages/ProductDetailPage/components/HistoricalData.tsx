import type { ProductDetail } from '../../../types/product';
import styles from './HistoricalData.module.css';

interface HistoricalDataProps {
    data: ProductDetail['historicalData'];
}

export const HistoricalData = ({ data }: HistoricalDataProps) => {
    const stats = [
        { label: 'Price Range | Last 12 Months', value: data.priceRange12m },
        { label: 'Price Range | Last 3 Months', value: data.priceRange3m },
        { label: 'Volatility', value: data.volatility },
        { label: 'Number of Sales | Last 3 Months', value: data.numberOfSales.toLocaleString() },
        { label: 'Price Premium | Last Sale', value: data.pricePremium },
        { label: 'Average Sale Price | Last 3 Months', value: `$${data.avgSalePrice}` },
    ];

    return (
        <div className={styles.wrapper}>
            <h3 className={styles.title}>Historical Data</h3>
            <div className={styles.grid}>
                {stats.map((s) => (
                    <div key={s.label} className={styles.card}>
                        <span className={styles.value}>{s.value}</span>
                        <span className={styles.label}>{s.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};