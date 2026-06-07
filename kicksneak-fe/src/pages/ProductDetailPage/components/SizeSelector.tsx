import { useState } from 'react';
import { Chip } from '@mui/material';
import { FlashOn } from '@mui/icons-material';
import type { SizeOption } from '../../../types/product';
import styles from './SizeSelector.module.css';

const SIZE_SYSTEMS = ['EU', 'US M', 'US W', 'UK', 'CM', 'KR'];

interface SizeSelectorProps {
    sizes: SizeOption[];
    selected: SizeOption | null;
    onSelect: (size: SizeOption) => void;
    pricePulse?: 'up' | 'down' | null;
}

export const SizeSelector = ({
    sizes,
    selected,
    onSelect,
    pricePulse,
}: SizeSelectorProps) => {
    const [system, setSystem] = useState('EU');

    const filtered = sizes.filter((s) => s.system === system);

    const allPrice = filtered.reduce((min, s) =>
        s.price !== null && s.price < (min ?? Infinity) ? s.price : min, null as number | null
    );

    return (
        <div className={styles.wrapper}>
            <div className={styles.systems}>
                {SIZE_SYSTEMS.map((sys) => (
                    <button
                        key={sys}
                        className={`${styles.sysBtn} ${system === sys ? styles.sysBtnActive : ''}`}
                        onClick={() => setSystem(sys)}
                    >
                        {sys}
                    </button>
                ))}
            </div>

            <div className={styles.grid}>
                {filtered.map((size) => (
                    <button
                        key={size.label}
                        className={`${styles.sizeBtn} ${selected?.label === size.label ? styles.sizeBtnActive : ''} ${size.price === null ? styles.sizeBid : ''}`}
                        onClick={() => onSelect(size)}
                    >
                        <span className={styles.sizeLabel}>{size.label.replace(system, '').trim()}</span>
                        <div className={styles.sizePriceWrap}>
                            <span className={`${styles.sizePrice} ${pricePulse === 'up' ? styles.pulseUp : ''} ${pricePulse === 'down' ? styles.pulseDown : ''}`}>
                                {size.price !== null ? `$${size.price}` : 'BID'}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};