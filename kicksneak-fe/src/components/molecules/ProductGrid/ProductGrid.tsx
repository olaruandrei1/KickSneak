import { useState, type ReactNode } from 'react';
import {
    Box, MenuItem, Select, FormControl,
    InputLabel, Tooltip, IconButton, Chip,
    type SelectChangeEvent,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import FilterListIcon from '@mui/icons-material/FilterList';
import styles from './ProductGrid.module.css';

export type GridMode = 'grid' | 'list';
export type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'most_sold';

interface ProductGridProps {
    children: ReactNode[];
    totalCount?: number;
    searchQuery?: string;
    defaultMode?: GridMode;
    showModeSwitch?: boolean;
    showSort?: boolean;
    showClearFilters?: boolean;
    onSortChange?: (sort: SortOption) => void;
    onClearFilters?: () => void;
    emptyState?: ReactNode;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'featured', label: 'Featured' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'most_sold', label: 'Most Sold' },
];

export const ProductGrid = ({
    children,
    totalCount,
    searchQuery,
    defaultMode = 'grid',
    showModeSwitch = true,
    showSort = true,
    showClearFilters = false,
    onSortChange,
    onClearFilters,
    emptyState,
}: ProductGridProps) => {
    const [mode, setMode] = useState<GridMode>(defaultMode);
    const [sort, setSort] = useState<SortOption>('featured');
    const [switching, setSwitching] = useState(false);

    const handleModeSwitch = (next: GridMode) => {
        if (next === mode) return;
        setSwitching(true);
        setTimeout(() => {
            setMode(next);
            setSwitching(false);
        }, 180);
    };

    const handleSort = (e: SelectChangeEvent) => {
        const val = e.target.value as SortOption;
        setSort(val);
        onSortChange?.(val);
    };

    if (children.length === 0 && emptyState) {
        return <div className={styles.empty}>{emptyState}</div>;
    }

    return (
        <div className={styles.wrapper}>

            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    {totalCount != null && (
                        <span className={styles.count}>
                            {searchQuery
                                ? <>Browse <strong>{totalCount.toLocaleString()}</strong> results for <strong>"{searchQuery}"</strong></>
                                : <><strong>{totalCount.toLocaleString()}</strong> items</>
                            }
                        </span>
                    )}
                    {showClearFilters && searchQuery && (
                        <div className={styles.chips}>
                            <Chip
                                label={`Search: "${searchQuery}"`}
                                onDelete={onClearFilters}
                                size="small"
                                sx={{
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '0.75rem',
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text)',
                                    borderColor: 'var(--color-border)',
                                    '& .MuiChip-deleteIcon': { color: 'var(--color-text-muted)' },
                                }}
                                variant="outlined"
                            />
                            <Chip
                                label="Clear All"
                                onClick={onClearFilters}
                                size="small"
                                sx={{
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '0.75rem',
                                    background: 'transparent',
                                    color: 'var(--color-text-muted)',
                                    borderColor: 'var(--color-border)',
                                }}
                                variant="outlined"
                            />
                        </div>
                    )}
                </div>

                <div className={styles.toolbarRight}>
                    {showSort && (
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel sx={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                Sort
                            </InputLabel>
                            <Select
                                value={sort}
                                label="Sort"
                                onChange={handleSort}
                                sx={{
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '0.82rem',
                                    color: 'var(--color-text)',
                                    borderRadius: '100px',
                                    background: 'var(--color-surface)',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-secondary)' },
                                    '& .MuiSvgIcon-root': { color: 'var(--color-text-muted)' },
                                }}
                            >
                                {SORT_OPTIONS.map((o) => (
                                    <MenuItem key={o.value} value={o.value}
                                        sx={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>
                                        {o.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {showModeSwitch && (
                        <Box className={styles.modeSwitcher}>
                            <Tooltip title="Grid view">
                                <IconButton
                                    size="small"
                                    onClick={() => handleModeSwitch('grid')}
                                    className={mode === 'grid' ? styles.modeActive : styles.modeInactive}
                                >
                                    <GridViewIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="List view">
                                <IconButton
                                    size="small"
                                    onClick={() => handleModeSwitch('list')}
                                    className={mode === 'list' ? styles.modeActive : styles.modeInactive}
                                >
                                    <ViewListIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </div>
            </div>

            <div className={`
        ${styles.grid}
        ${mode === 'list' ? styles.listMode : styles.gridMode}
        ${switching ? styles.switching : ''}
      `}>
                {children.map((child, i) => (
                    <div
                        key={i}
                        className={`${styles.item} ${mode === 'list' ? styles.itemList : styles.itemGrid}`}
                    >
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
};