import type { ProductItem } from '../../../types/product';
import styles from './ProductChip.module.css';

interface ProductChipProps {
    item: ProductItem;
    index: number;
    onClick?: (item: ProductItem) => void;
}

export const ProductChip = ({ item, index, onClick }: ProductChipProps) => {
    return (
        <div
            className={styles.chip}
            style={{ animationDelay: `${index * 60}ms` }}
            onClick={() => onClick?.(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.(item)}
        >
            <div className={styles.imageWrap}>
                <img src={item.image} alt={item.name} className={styles.image} />
            </div>
            <div className={styles.info}>
                <span className={styles.brand}>{item.brand}</span>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.price}>${item.price}</span>
            </div>
            {item.isNew && <span className={styles.badge}>NEW</span>}
        </div>
    );
};