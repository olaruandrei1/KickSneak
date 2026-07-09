import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Typography, Drawer, Button, IconButton, Chip, Box } from '@mui/material';
import { Close, TuneOutlined } from '@mui/icons-material';
import { httpClient } from '../../services/axiosService';
import { localStorageService } from '../../services/localStorageService';
import type { ProductItem } from '../../types/product';
import type { FilterState } from '../../types/filters';
import type { SortOption } from '../../components/molecules/ProductGrid/ProductGrid';
import { DEFAULT_FILTERS } from '../../types/filters';
import { ProductCard } from '../../components/atoms/ProductCard/ProductCard';
import { ProductGrid } from '../../components/molecules/ProductGrid/ProductGrid';
import { FiltersSidebar } from './components/FiltersSidebar';
import { Spinner } from '../../components/atoms/Spinner/Spinner';
import { useResponsiveStore } from '../../services/responsiveObserver';
import { Switch, FormControlLabel } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import { ApiRoutes } from '../../services/apiRoutes';
import { aiSearchService } from '../../services/aiSearchService';
import type { SearchHit } from '../../services/searchHubService';
import styles from './SearchResultsPage.module.css';
import { useAuthStore } from '../../store/authStore';

const PAGE_SIZE = 24;

interface SearchPagedResponse {
    items: ProductItem[];
    total: number;
    page: number;
    pageSize: number;
    facets: any;
    detected: { brandId: string | null; brandName: string | null; categoryId: string | null; categoryName: string | null };
}

const hitToProductItem = (hit: SearchHit): ProductItem => ({
    id: hit.id,
    name: hit.title,
    brand: hit.brand,
    category: hit.category,
    price: hit.price,
    image: hit.image,
    sold: hit.sold,
    isNew: hit.isNew,
    isFavorite: false,
});

// ── AI Recommendations (client-side cosine similarity on viewed history) ──

type FeatureVector = Record<string, number>;

const buildVector = (item: ProductItem): FeatureVector => {
    const vec: FeatureVector = {};
    if (item.brand) vec[`brand:${item.brand.toLowerCase()}`] = 2;
    if (item.category) vec[`cat:${item.category.toLowerCase()}`] = 1.5;
    const bucket = Math.floor((item.price ?? 0) / 100) * 100;
    vec[`price:${bucket}`] = 1;
    return vec;
};

const cosineSimilarity = (a: FeatureVector, b: FeatureVector): number => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let dot = 0, normA = 0, normB = 0;
    keys.forEach((k) => {
        const va = a[k] ?? 0;
        const vb = b[k] ?? 0;
        dot += va * vb;
        normA += va * va;
        normB += vb * vb;
    });
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getRecommendations = (
    allItems: ProductItem[],
    viewed: ProductItem[],
    currentIds: Set<string>,
    limit = 4
): ProductItem[] => {
    if (viewed.length === 0) return [];
    const validViewed = viewed.filter((i) => i?.brand && i?.category);
    if (validViewed.length === 0) return [];
    const aggregate: FeatureVector = {};
    validViewed.forEach((item) => {
        const vec = buildVector(item);
        Object.entries(vec).forEach(([k, v]) => {
            aggregate[k] = (aggregate[k] ?? 0) + v;
        });
    });
    return allItems
        .filter((item) => item?.brand && item?.category && !currentIds.has(item.id))
        .map((item) => ({ item, score: cosineSimilarity(aggregate, buildVector(item)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((r) => r.item);
};

// ── Helpers ──

const filtersFromParams = (sp: URLSearchParams): FilterState => ({
    ...DEFAULT_FILTERS,
    categories: sp.getAll('category'),
    brands: sp.getAll('brand'),
    activities: sp.getAll('activity'),
    colors: sp.getAll('color'),
    genders: sp.getAll('gender'),
    priceMin: sp.get('priceMin') ? Number(sp.get('priceMin')) : DEFAULT_FILTERS.priceMin,
    priceMax: sp.get('priceMax') ? Number(sp.get('priceMax')) : DEFAULT_FILTERS.priceMax,
});

const filtersToParams = (filters: FilterState, query: string, sort: SortOption): URLSearchParams => {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    filters.categories.forEach((c) => p.append('category', c));
    filters.brands.forEach((b) => p.append('brand', b));
    filters.genders.forEach((g) => p.append('gender', g));
    filters.activities.forEach((a) => p.append('activity', a));
    filters.colors.forEach((c) => p.append('color', c));
    if (filters.priceMin > 0) p.set('priceMin', String(filters.priceMin));
    if (filters.priceMax < 10000) p.set('priceMax', String(filters.priceMax));
    if (sort !== 'featured') p.set('sort', sort);
    return p;
};

// ─────────────────────────────────────────────────────────────────────────────

export const SearchResultsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isMobile, isTablet } = useResponsiveStore();

    const query = searchParams.get('q') ?? '';
    const sortParam = (searchParams.get('sort') as SortOption) ?? 'featured';
    const paramsKey = searchParams.toString();

    const [allItems, setAllItems] = useState<ProductItem[]>([]);
    const [items, setItems] = useState<ProductItem[]>([]);
    const [total, setTotal] = useState(0);
    const [facets, setFacets] = useState<SearchPagedResponse["facets"] | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [filters, setFilters] = useState<FilterState>(() => filtersFromParams(searchParams));
    const [sort, setSort] = useState<SortOption>(sortParam);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [aiMode, setAiMode] = useState(searchParams.get('ai') === '1');
    const [aiLoading, setAiLoading] = useState(false);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const isFirstLoad = useRef(true);
    const loadingRef = useRef(false);
    const itemsCountRef = useRef(0);

    const recentlyViewed = useMemo<ProductItem[]>(
        () => localStorageService.get<ProductItem[]>('recently_viewed') ?? [],
        []
    );

    // ── Sync filters + sort din URL ──
    useEffect(() => {
        setFilters(filtersFromParams(searchParams));
        setSort(sortParam);
        setPage(1);
        setHasMore(true);
        // A search launched with the navbar AI toggle arrives as ?ai=1.
        if (searchParams.get('ai') === '1') setAiMode(true);
    }, [paramsKey]);

    // ── Fetch from Elastic ──
    // ── Fetch from Backend ──
    const fetchFromElastic = useCallback(async (isLoadMore = false) => {
        // Prevent overlapping "load more" calls from stacking up (runaway pagination guard).
        if (isLoadMore && loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        if (!isLoadMore) setRefreshing(true);
        try {
            const currentFilters = filtersFromParams(searchParams);
            const params = new URLSearchParams({
                page: String(isLoadMore ? page : 1),
                pageSize: String(PAGE_SIZE),
            });
            if (query.trim()) params.set('q', query);

            if (currentFilters.brands.length > 0)
                currentFilters.brands.forEach(b => params.append('brand', b));
            if (currentFilters.categories.length > 0)
                currentFilters.categories.forEach(c => params.append('category', c));
            if (currentFilters.genders.length > 0)
                currentFilters.genders.forEach(g => params.append('gender', g));
            if (currentFilters.colors.length > 0)
                currentFilters.colors.forEach(c => params.append('color', c));
            if (currentFilters.activities.length > 0)
                currentFilters.activities.forEach(a => params.append('activity', a));
            if (currentFilters.priceMin > 0)
                params.set('minPrice', String(currentFilters.priceMin));
            if (currentFilters.priceMax < 10000)
                params.set('maxPrice', String(currentFilters.priceMax));
            if (sort !== 'featured')
                params.set('sort', sort);

            const url = `${ApiRoutes.searchResultsPaged}?${params.toString()}`;
            const res = await httpClient.get<SearchPagedResponse>(url);

            const data = res.data;
            const newItems = data.items;

            if (isLoadMore) {
                // No more items came back → stop paginating (avoids infinite requests).
                if (newItems.length === 0) {
                    setHasMore(false);
                    return;
                }
                setAllItems(prev => [...prev, ...newItems]);
            } else {
                setAllItems(newItems);
                
                if (data.detected?.brandName) {
                    const detectedBrand = data.detected.brandName;
                    if (!currentFilters.brands.includes(detectedBrand)) {
                        setFilters(prev => ({ ...prev, brands: [...prev.brands, detectedBrand] }));
                    }
                }
            }

            setTotal(data.total);
            setFacets(data.facets);
            setHasMore(data.page * data.pageSize < data.total);
        } catch {
            // A failed request must halt pagination, otherwise the infinite-scroll
            // observer keeps firing and spams the backend with the same bad page.
            setHasMore(false);
            if (!isLoadMore) setAllItems([]);
        } finally {
            loadingRef.current = false;
            setLoading(false);
            if (!isLoadMore) setRefreshing(false);
        }
    }, [query, searchParams, page, sort]);

    useEffect(() => {
        isFirstLoad.current = true;
        fetchFromElastic(false).then(() => { isFirstLoad.current = false; });
    }, [query, paramsKey, sort]);

    useEffect(() => {
        if (!isFirstLoad.current && page > 1) {
            fetchFromElastic(true);
        }
    }, [page]);

    // ── AI search mode ──
    useEffect(() => {
        if (!aiMode || !query.trim()) return;

        const fetchAi = async () => {
            setAiLoading(true);
            try {
                const params = new URLSearchParams({ q: query, pageSize: '50', page: '1' });
                const res = await httpClient.get<SearchPagedResponse>(`${ApiRoutes.searchResultsPaged}?${params.toString()}`);
                const elasticItems = res.data.items;

                if (elasticItems.length === 0) {
                    setAllItems([]);
                    return;
                }

                const firebaseUid = useAuthStore.getState().user?.uid ?? null;
                const candidateIds = elasticItems.map(item => item.id);
                const aiResults = await aiSearchService.rerank(query.trim(), candidateIds, firebaseUid);

                if (aiResults.length === 0) {
                    setAllItems(elasticItems);
                    return;
                }

                const scoreMap = new Map(aiResults.map(r => [r.id, r.score]));
                const reranked = [...elasticItems].sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));

                setAllItems(reranked);
                setTotal(reranked.length);
                setHasMore(false);
            } catch {
                await fetchFromElastic(false);
            } finally {
                setAiLoading(false);
            }
        };

        fetchAi();
    }, [aiMode, query]);

    useEffect(() => {
        setItems(allItems);
        itemsCountRef.current = allItems.length;
    }, [allItems]);

    const recommendations = useMemo(() => {
        const currentIds = new Set(allItems.map((i) => i.id));
        return getRecommendations(allItems, recentlyViewed, currentIds);
    }, [allItems, recentlyViewed]);

    // ── Infinite scroll ──
    useEffect(() => {
        observerRef.current?.disconnect();
        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    hasMore &&
                    !loadingRef.current &&
                    !isFirstLoad.current &&
                    itemsCountRef.current > 0
                ) {
                    setPage((prev) => prev + 1);
                }
            },
            { threshold: 0.1 }
        );
        if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
        return () => observerRef.current?.disconnect();
    }, [hasMore, loading]);

    // ── Handlers ──
    const handleFiltersChange = useCallback((next: FilterState) => {
        setSearchParams(filtersToParams(next, query, sort), { replace: true });
    }, [query, sort, setSearchParams]);

    const handleSortChange = useCallback((next: SortOption) => {
        setSearchParams(filtersToParams(filters, query, next), { replace: true });
    }, [filters, query, setSearchParams]);

    const activeFilterCount = [
        filters.availableNow,
        ...filters.categories,
        ...filters.genders,
        ...filters.brands,
        ...filters.activities,
        ...filters.colors,
        filters.priceMin > 0 || filters.priceMax < 10000,
    ].filter(Boolean).length;

    const isMobileOrTablet = isMobile || isTablet;

    const breadcrumb = (() => {
        const parts: string[] = [];
        if (filters.genders.length) parts.push(filters.genders.join(' & '));
        if (filters.categories.length) parts.push(filters.categories.join(' & '));
        if (filters.brands.length) parts.push(filters.brands.join(' & '));
        if (query) parts.push(`"${query}"`);
        return parts.join(' · ') || 'All Products';
    })();

    return (
        <div className={styles.page}>
            <div className={styles.breadcrumb}>
                <button className={styles.breadcrumbLink} onClick={() => navigate('/')}>Home</button>
                <span className={styles.breadcrumbSep}>/</span>
                <span className={styles.breadcrumbCurrent}>{breadcrumb}</span>
            </div>

            <div className={styles.layout}>
                {!isMobileOrTablet && (
                    <FiltersSidebar filters={filters} onChange={handleFiltersChange} facets={facets} />
                )}

                <div className={styles.content}>
                    {isMobileOrTablet && (
                        <div className={styles.mobileToolbar}>
                            <Button
                                variant="outlined"
                                startIcon={<TuneOutlined />}
                                onClick={() => setDrawerOpen(true)}
                                size="small"
                                sx={{
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)',
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '0.78rem',
                                    borderRadius: '100px',
                                    textTransform: 'none',
                                }}
                            >
                                Filters
                                {activeFilterCount > 0 && (
                                    <Chip label={activeFilterCount} size="small"
                                        sx={{ ml: 1, height: 18, fontSize: '0.65rem', background: 'var(--color-secondary)', color: 'var(--color-bg)' }}
                                    />
                                )}
                            </Button>
                        </div>
                    )}

                    <div className={styles.aiToggle}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={aiMode}
                                    onChange={(_, checked) => setAiMode(checked)}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: 'var(--color-secondary)',
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                            backgroundColor: 'var(--color-secondary)',
                                        },
                                    }}
                                />
                            }
                            label={
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '0.82rem',
                                    color: aiMode ? 'var(--color-secondary)' : 'var(--color-text-muted)',
                                    transition: 'color 0.2s ease',
                                }}>
                                    <AutoAwesome sx={{ fontSize: 16 }} />
                                    Search with AI
                                    {aiLoading && (
                                        <span style={{
                                            width: 14,
                                            height: 14,
                                            border: '2px solid var(--color-secondary)',
                                            borderTopColor: 'transparent',
                                            borderRadius: '50%',
                                            animation: 'spin 0.6s linear infinite',
                                            display: 'inline-block',
                                        }} />
                                    )}
                                </span>
                            }
                        />
                    </div>

                    <div className={styles.gridWrap}>
                        {refreshing && <div className={styles.filterBar} />}
                        <div className={refreshing ? styles.gridFading : undefined}>
                            <ProductGrid
                                totalCount={total}
                                searchQuery={query || breadcrumb}
                                defaultMode="grid"
                                showModeSwitch
                                showSort
                                showClearFilters
                                onSortChange={handleSortChange}
                                onClearFilters={() => navigate('/search')}
                                emptyState={
                                    !loading ? (
                                        <Box sx={{ textAlign: 'center', py: 8 }}>
                                            <Typography variant="h6" sx={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                                                No results found
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
                                                Try adjusting your filters or search query.
                                            </Typography>
                                        </Box>
                                    ) : undefined
                                }
                            >
                                {items.map((item) => (
                                    <ProductCard key={item.id} item={item} />
                                ))}
                            </ProductGrid>
                        </div>
                    </div>

                    <div ref={sentinelRef} className={styles.sentinel} />

                    {loading && (
                        <div className={styles.loadingMore}><Spinner size="md" /></div>
                    )}

                    {!hasMore && items.length > 0 && (
                        <div className={styles.endMessage}>
                            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                                You've seen all {total} results
                            </Typography>
                        </div>
                    )}

                    {recommendations.length > 0 && !loading && (
                        <div className={styles.recsSection}>
                            <div className={styles.recsHeader}>
                                <span className={styles.recsTitle}>Recommended for you</span>
                                <span className={styles.recsBadge}>AI</span>
                            </div>
                            <p className={styles.recsSubtitle}>Based on your browsing history</p>
                            <div className={styles.recsGrid}>
                                {recommendations.map((item) => (
                                    <ProductCard key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                slotProps={{
                    paper: {
                        sx: {
                            background: 'var(--color-bg)',
                            width: 280,
                            borderRight: '1px solid var(--color-border)',
                        },
                    },
                }}
            >
                <div className={styles.drawerHeader}>
                    <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontWeight: 700 }}>
                        Filters
                    </Typography>
                    <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>
                        <Close />
                    </IconButton>
                </div>
                <FiltersSidebar filters={filters} onChange={handleFiltersChange} facets={facets} />
            </Drawer>
        </div>
    );
};