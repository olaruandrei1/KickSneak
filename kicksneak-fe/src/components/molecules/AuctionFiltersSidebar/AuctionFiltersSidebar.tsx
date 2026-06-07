import { useState } from 'react';
import { Slider, Checkbox, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import type { AuctionFilters } from '../../../types/auction';
import styles from './AuctionFiltersSidebar.module.css';
import { useAuctionStore } from '../../../store/auctionStore';

const BRANDS = ['Nike', 'Adidas', 'New Balance', 'ASICS', 'Jordan', 'Puma'];
const CATEGORIES = ['Sneakers', 'Apparel', 'Collectibles'];
const ENDING_OPTIONS: Array<{ value: NonNullable<AuctionFilters['endingWithin']>; label: string }> = [
    { value: '1h', label: 'Within 1 hour' },
    { value: '6h', label: 'Within 6 hours' },
    { value: '24h', label: 'Within 24 hours' },
    { value: '3d', label: 'Within 3 days' },
];

const AuctionFiltersSidebar = () => {
    const filters = useAuctionStore((s) => s.filters);
    const setFilters = useAuctionStore((s) => s.setFilters);
    const resetFilters = useAuctionStore((s) => s.resetFilters);

    const [openSection, setOpenSection] = useState<string | null>('ending');
    const [priceRange, setPriceRange] = useState<[number, number]>([
        filters.priceMin ?? 0,
        filters.priceMax ?? 5000,
    ]);

    const toggleSection = (section: string) =>
        setOpenSection((cur) => (cur === section ? null : section));

    const toggleArrayFilter = (key: 'brand' | 'category', value: string) => {
        const current = filters[key] ?? [];
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        setFilters({ [key]: next.length ? next : undefined });
    };

    const onPriceChange = (_: Event, value: number | number[]) => {
        if (Array.isArray(value)) setPriceRange([value[0], value[1]]);
    };

    const onPriceCommitted = () => {
        setFilters({ priceMin: priceRange[0], priceMax: priceRange[1] });
    };

    return (
        <aside className={styles.sidebar}>
            <header className={styles.header}>
                <h3 className={styles.title}>Filters</h3>
                <button type="button" className={styles.resetBtn} onClick={resetFilters}>
                    Reset
                </button>
            </header>

            {/* Ending Within */}
            <section className={styles.section}>
                <button
                    type="button"
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('ending')}
                >
                    <span>Ending Within</span>
                    <span className={styles.chevron}>{openSection === 'ending' ? '−' : '+'}</span>
                </button>
                {openSection === 'ending' && (
                    <RadioGroup
                        value={filters.endingWithin ?? ''}
                        onChange={(e) =>
                            setFilters({
                                endingWithin: (e.target.value || undefined) as AuctionFilters['endingWithin'],
                            })
                        }
                        className={styles.radioGroup}
                    >
                        <FormControlLabel value="" control={<Radio size="small" />} label="Any time" />
                        {ENDING_OPTIONS.map((opt) => (
                            <FormControlLabel
                                key={opt.value}
                                value={opt.value}
                                control={<Radio size="small" />}
                                label={opt.label}
                            />
                        ))}
                    </RadioGroup>
                )}
            </section>

            {/* Reserve */}
            <section className={styles.section}>
                <button
                    type="button"
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('reserve')}
                >
                    <span>Reserve</span>
                    <span className={styles.chevron}>{openSection === 'reserve' ? '−' : '+'}</span>
                </button>
                {openSection === 'reserve' && (
                    <div className={styles.checkboxGroup}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="small"
                                    checked={filters.hasReserve === true}
                                    onChange={(e) =>
                                        setFilters({ hasReserve: e.target.checked ? true : undefined })
                                    }
                                />
                            }
                            label="Has reserve"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="small"
                                    checked={filters.reserveMet === true}
                                    onChange={(e) =>
                                        setFilters({ reserveMet: e.target.checked ? true : undefined })
                                    }
                                />
                            }
                            label="Reserve met"
                        />
                    </div>
                )}
            </section>

            {/* Category */}
            <section className={styles.section}>
                <button
                    type="button"
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('category')}
                >
                    <span>Category</span>
                    <span className={styles.chevron}>{openSection === 'category' ? '−' : '+'}</span>
                </button>
                {openSection === 'category' && (
                    <div className={styles.checkboxGroup}>
                        {CATEGORIES.map((cat) => (
                            <FormControlLabel
                                key={cat}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={filters.category?.includes(cat) ?? false}
                                        onChange={() => toggleArrayFilter('category', cat)}
                                    />
                                }
                                label={cat}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Brand */}
            <section className={styles.section}>
                <button
                    type="button"
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('brand')}
                >
                    <span>Brand</span>
                    <span className={styles.chevron}>{openSection === 'brand' ? '−' : '+'}</span>
                </button>
                {openSection === 'brand' && (
                    <div className={styles.checkboxGroup}>
                        {BRANDS.map((brand) => (
                            <FormControlLabel
                                key={brand}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={filters.brand?.includes(brand) ?? false}
                                        onChange={() => toggleArrayFilter('brand', brand)}
                                    />
                                }
                                label={brand}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Price */}
            <section className={styles.section}>
                <button
                    type="button"
                    className={styles.sectionHeader}
                    onClick={() => toggleSection('price')}
                >
                    <span>Current Bid</span>
                    <span className={styles.chevron}>{openSection === 'price' ? '−' : '+'}</span>
                </button>
                {openSection === 'price' && (
                    <div className={styles.priceWrap}>
                        <Slider
                            value={priceRange}
                            onChange={onPriceChange}
                            onChangeCommitted={onPriceCommitted}
                            valueLabelDisplay="auto"
                            min={0}
                            max={5000}
                            step={25}
                        />
                        <div className={styles.priceLabels}>
                            <span>${priceRange[0]}</span>
                            <span>${priceRange[1]}+</span>
                        </div>
                    </div>
                )}
            </section>
        </aside>
    );
};

export default AuctionFiltersSidebar;