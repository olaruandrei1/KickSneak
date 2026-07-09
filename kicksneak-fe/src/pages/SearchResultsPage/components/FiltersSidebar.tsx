import { useEffect, useState } from 'react';
import {
    Switch, FormControlLabel, Checkbox,
    Slider, Collapse, Divider,
} from '@mui/material';
import {
    ExpandLess, ExpandMore,
    FlashOn,
} from '@mui/icons-material';
import type { FilterState } from '../../../types/filters';
import { FILTER_OPTIONS } from '../../../types/filters';
import styles from './FiltersSidebar.module.css';

interface FiltersSidebarProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
    facets?: any;
}

type SectionKey = 'category' | 'gender' | 'brands' | 'activity' | 'color' | 'price';

export const FiltersSidebar = ({ filters, onChange, facets }: FiltersSidebarProps) => {
    const activeActivities = facets?.activities?.map((a: any) => a.name) || FILTER_OPTIONS.activities;
    const activeColors = facets?.colors?.map((c: any) => c.name) || FILTER_OPTIONS.colors.map((c: any) => c.label);
    const displayedColors = FILTER_OPTIONS.colors.filter((c: any) => activeColors.includes(c.label));
    const activeCategories = facets?.categories?.map((c: any) => c.name) || FILTER_OPTIONS.categories;
    const activeGenders = facets?.genders?.map((g: any) => g.name) || FILTER_OPTIONS.genders;
    const activeBrands = facets?.brands?.map((b: any) => b.name) || FILTER_OPTIONS.brands;

    const [openSection, setOpenSection] = useState<SectionKey | null>('category');

    const toggle = (section: SectionKey) =>
        setOpenSection((prev) => (prev === section ? null : section));

    useEffect(() => {
        if (filters.genders.length) setOpenSection('gender');
        else if (filters.brands.length) setOpenSection('brands');
        else if (filters.categories.length) setOpenSection('category');
    }, [
        filters.genders.length,
        filters.brands.length,
        filters.categories.length,
    ]);

    const toggleMulti = (
        key: 'categories' | 'genders' | 'brands' | 'activities' | 'colors',
        value: string
    ) => {
        const current = filters[key];
        const updated = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        onChange({ ...filters, [key]: updated });
    };

    // Category & Gender are single-select: pick one, or clear by re-clicking it.
    const toggleSingle = (
        key: 'categories' | 'genders',
        value: string
    ) => {
        const updated = filters[key].includes(value) ? [] : [value];
        onChange({ ...filters, [key]: updated });
    };

    const sxSwitch = {
        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-secondary)' },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--color-secondary)' },
    };

    const sxCheckbox = {
        color: 'var(--color-border)',
        '&.Mui-checked': { color: 'var(--color-secondary)' },
        padding: '4px 8px',
    };

    const sxSlider = {
        color: 'var(--color-secondary)',
        '& .MuiSlider-thumb': {
            backgroundColor: 'var(--color-accent)',
            width: 14, height: 14,
            '&:hover': { boxShadow: '0 0 0 6px rgba(163,197,27,0.16)' },
        },
        '& .MuiSlider-track': { backgroundColor: 'var(--color-secondary)', border: 'none' },
        '& .MuiSlider-rail': { backgroundColor: 'var(--color-border)' },
    };

    return (
        <aside className={styles.sidebar}>

            <Divider sx={{ borderColor: 'var(--color-border)' }} />

            <Divider sx={{ borderColor: 'var(--color-border)' }} />

            {/* Category */}
            <button className={styles.sectionHeader} onClick={() => toggle('category')}>
                <span className={styles.sectionLabel}>CATEGORY</span>
                {openSection === 'category' ? <ExpandLess sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} />}
            </button>
            <Collapse in={openSection === 'category'}>
                <div className={styles.optionList}>
                    {activeCategories.map((cat: string) => (
                        <button
                            key={cat}
                            className={`${styles.optionItem} ${filters.categories.includes(cat) ? styles.optionActive : ''}`}
                            onClick={() => toggleSingle('categories', cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </Collapse>
            <Divider sx={{ borderColor: 'var(--color-border)' }} />

            {/* Gender */}
            <button className={styles.sectionHeader} onClick={() => toggle('gender')}>
                <span className={styles.sectionLabel}>GENDER</span>
                {openSection === 'gender' ? <ExpandLess sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} />}
            </button>
            <Collapse in={openSection === 'gender'}>
                <div className={styles.checkList}>
                    {activeGenders.map((g: string) => (
                        <FormControlLabel
                            key={g}
                            control={
                                <Checkbox
                                    size="small"
                                    checked={filters.genders.includes(g)}
                                    onChange={() => toggleSingle('genders', g)}
                                    sx={sxCheckbox}
                                />
                            }
                            label={<span className={styles.checkLabel}>{g}</span>}
                        />
                    ))}
                </div>
            </Collapse>
            <Divider sx={{ borderColor: 'var(--color-border)' }} />

            {/* Brands */}
            <button className={styles.sectionHeader} onClick={() => toggle('brands')}>
                <span className={styles.sectionLabel}>BRANDS</span>
                {openSection === 'brands' ? <ExpandLess sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} />}
            </button>
            <Collapse in={openSection === 'brands'}>
                <div className={`${styles.checkList} ${styles.scrollable}`}>
                    {activeBrands.map((b: string) => (
                        <FormControlLabel
                            key={b}
                            control={
                                <Checkbox
                                    size="small"
                                    checked={filters.brands.includes(b)}
                                    onChange={() => toggleMulti('brands', b)}
                                    sx={sxCheckbox}
                                />
                            }
                            label={<span className={styles.checkLabel}>{b}</span>}
                        />
                    ))}
                </div>
            </Collapse>
            <Divider sx={{ borderColor: 'var(--color-border)' }} />

            {/* Activity */}
            <button className={styles.sectionHeader} onClick={() => toggle('activity')}>
                <span className={styles.sectionLabel}>ACTIVITY</span>
                {openSection === 'activity' ? <ExpandLess sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} />}
            </button>
            <Collapse in={openSection === 'activity'}>
                <div className={styles.checkList}>
                    {activeActivities.map((a: string) => (
                        <FormControlLabel
                            key={a}
                            control={
                                <Checkbox
                                    size="small"
                                    checked={filters.activities.includes(a)}
                                    onChange={() => toggleMulti('activities', a)}
                                    sx={sxCheckbox}
                                />
                            }
                            label={<span className={styles.checkLabel}>{a}</span>}
                        />
                    ))}
                </div>
            </Collapse>
            <Divider sx={{ borderColor: 'var(--color-border)' }} />

            {/* Color */}
            <button className={styles.sectionHeader} onClick={() => toggle('color')}>
                <span className={styles.sectionLabel}>COLOR</span>
                {openSection === 'color' ? <ExpandLess sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} />}
            </button>
            <Collapse in={openSection === 'color'}>
                <div className={styles.colorGrid}>
                    {displayedColors.map((c: any) => (
                        <button
                            key={c.label}
                            className={`${styles.colorItem} ${filters.colors.includes(c.label) ? styles.colorActive : ''}`}
                            onClick={() => toggleMulti('colors', c.label)}
                            title={c.label}
                        >
                            <span
                                className={styles.colorDot}
                                style={{ background: c.hex, border: c.label === 'White' ? '1px solid var(--color-border)' : 'none' }}
                            />
                            <span className={styles.colorLabel}>{c.label}</span>
                        </button>
                    ))}
                </div>
            </Collapse>
            <Divider sx={{ borderColor: 'var(--color-border)' }} />

            {/* Price */}
            <button className={styles.sectionHeader} onClick={() => toggle('price')}>
                <span className={styles.sectionLabel}>PRICE</span>
                {openSection === 'price' ? <ExpandLess sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'var(--color-text-muted)' }} />}
            </button>
            <Collapse in={openSection === 'price'}>
                <div className={styles.priceWrap}>
                    <Slider
                        value={[filters.priceMin, filters.priceMax]}
                        min={0}
                        max={10000}
                        step={50}
                        onChange={(_, val) => {
                            const [min, max] = val as number[];
                            onChange({ ...filters, priceMin: min, priceMax: max });
                        }}
                        sx={sxSlider}
                    />
                    <div className={styles.priceLabels}>
                        <span className={styles.priceTag}>${filters.priceMin.toLocaleString()}</span>
                        <span className={styles.priceTag}>
                            ${filters.priceMax === 10000 ? '10000+' : filters.priceMax.toLocaleString()}
                        </span>
                    </div>
                </div>
            </Collapse>

        </aside>
    );
};