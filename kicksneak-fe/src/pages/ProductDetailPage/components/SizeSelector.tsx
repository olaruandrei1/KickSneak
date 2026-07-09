import { useState, useMemo } from 'react';
import { Chip } from '@mui/material';
import { FlashOn } from '@mui/icons-material';
import type { SizeOption } from '../../../types/product';
import styles from './SizeSelector.module.css';

const SIZE_SYSTEMS = ['EU', 'US M', 'US W', 'UK', 'CM', 'KR'] as const;
type SizeSystem = typeof SIZE_SYSTEMS[number];

const getNumeric = (val: any) => {
    if (val == null || val === '') return null;
    const num = parseFloat(String(val));
    return isNaN(num) ? null : num;
};

const extractFromLabel = (label: string) => {
    let us = null, eu = null, uk = null;
    if (!label) return { us, eu, uk };
    
    const usMatch = label.match(/US\s*([\d\.]+)/i);
    if (usMatch) us = parseFloat(usMatch[1]);
    
    const ukMatch = label.match(/UK\s*([\d\.]+)/i);
    if (ukMatch) uk = parseFloat(ukMatch[1]);
    
    const euMatch = label.match(/EU\s*([\d\.]+)/i);
    if (euMatch) {
        eu = parseFloat(euMatch[1]);
    } else {
        const parts = label.split('/').map(p => p.trim());
        for (const p of parts) {
            if (/^[\d\.]+$/.test(p)) {
                const n = parseFloat(p);
                if (n >= 20 && n <= 65) eu = n;
            }
        }
    }
    return { us, eu, uk };
};

const getSizeDisplayAndSortValue = (size: SizeOption, system: SizeSystem): { display: string; sortValue: number } => {
    let eu = getNumeric(size.eu);
    let us = getNumeric(size.us);
    let uk = getNumeric(size.uk);
    let cm = getNumeric(size.cm);

    if (eu === null && us === null && uk === null) {
        const extracted = extractFromLabel(size.label || '');
        if (extracted.eu !== null) eu = extracted.eu;
        if (extracted.us !== null) us = extracted.us;
        if (extracted.uk !== null) uk = extracted.uk;
    }

    if (cm === null && us !== null) {
        cm = us * 0.5 + 22.5;
    }

    const lbl = size.label || '';

    switch (system) {
        case 'EU': return { display: eu !== null ? `EU ${eu}` : lbl, sortValue: eu !== null ? eu : Number.MAX_SAFE_INTEGER };
        case 'US M': return { display: us !== null ? `US ${us}` : lbl, sortValue: us !== null ? us : Number.MAX_SAFE_INTEGER };
        case 'US W': return { display: us !== null ? `US ${us + 1.5} W` : lbl, sortValue: us !== null ? us + 1.5 : Number.MAX_SAFE_INTEGER };
        case 'UK': return { display: uk !== null ? `UK ${uk}` : lbl, sortValue: uk !== null ? uk : Number.MAX_SAFE_INTEGER };
        case 'CM': return { display: cm !== null ? `${cm} cm` : lbl, sortValue: cm !== null ? cm : Number.MAX_SAFE_INTEGER };
        case 'KR': return { display: cm !== null ? `${Math.round(cm * 10)}` : lbl, sortValue: cm !== null ? Math.round(cm * 10) : Number.MAX_SAFE_INTEGER };
        default: return { display: lbl, sortValue: Number.MAX_SAFE_INTEGER };
    }
};

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

    const sortedSizes = useMemo(() => {
        return [...sizes].map(size => {
            const { display, sortValue } = getSizeDisplayAndSortValue(size, system);
            return { ...size, display, sortValue };
        }).sort((a, b) => {
            if (a.sortValue === Number.MAX_SAFE_INTEGER && b.sortValue === Number.MAX_SAFE_INTEGER) {
                return (a.label || '').localeCompare(b.label || '');
            }
            return a.sortValue - b.sortValue;
        });
    }, [sizes, system]);

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
                {sortedSizes.map((size) => {
                    return (
                        <button
                            key={size.sizeId || size.label}
                            className={`${styles.sizeBtn} ${selected?.sizeId === size.sizeId || selected?.label === size.label ? styles.sizeBtnActive : ''} ${size.price === null ? styles.sizeBid : ''}`}
                            onClick={() => onSelect(size)}
                        >
                            <span className={styles.sizeLabel}>{size.display}</span>
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