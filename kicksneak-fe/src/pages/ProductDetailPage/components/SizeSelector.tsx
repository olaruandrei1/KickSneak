import { useState } from 'react';
import { Chip } from '@mui/material';
import { FlashOn } from '@mui/icons-material';
import type { SizeOption } from '../../../types/product';
import styles from './SizeSelector.module.css';

const SIZE_SYSTEMS = ['EU', 'US', 'UK', 'CM', 'KR'] as const;
type SizeSystem = typeof SIZE_SYSTEMS[number];

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
    const [system, setSystem] = useState<SizeSystem>('EU');

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
                {sizes.map((size) => {
                    const sysKey = system.toLowerCase() as keyof SizeOption;
                    const displayValue = size[sysKey] ? String(size[sysKey]) : size.label;

                    return (
                        <button
                            key={size.sizeId || size.label}
                            className={`${styles.sizeBtn} ${selected?.sizeId === size.sizeId || selected?.label === size.label ? styles.sizeBtnActive : ''} ${size.price === null ? styles.sizeBid : ''}`}
                            onClick={() => onSelect(size)}
                        >
                            <span className={styles.sizeLabel}>{displayValue}</span>
                            <div className={styles.sizePriceWrap}>
                                <span className={`${styles.sizePrice} ${pricePulse === 'up' ? styles.pulseUp : ''} ${pricePulse === 'down' ? styles.pulseDown : ''}`}>
                                    {size.price !== null ? `${size.price}` : 'BID'}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};