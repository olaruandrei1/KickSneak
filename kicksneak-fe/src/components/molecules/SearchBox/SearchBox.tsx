import {
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AutoAwesome } from '@mui/icons-material';
import type { ProductItem } from '../../../types/product';
import { ProductChip } from '../../atoms/ProductChip/ProductChip';
import { searchHubService, type SearchHit } from '../../../services/searchHubService';
import { useAuthStore } from '../../../store/authStore';
import { aiSearchService } from '../../../services/aiSearchService';
import { httpClient } from '../../../services/axiosService';
import { ApiRoutes } from '../../../services/apiRoutes';
import styles from './SearchBox.module.css';

interface SearchBoxProps {
    variant?: 'desktop' | 'mobile';
    onProductClick?: (item: ProductItem) => void;
    onClose?: () => void;
    autoFocus?: boolean;
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

export const SearchBox = ({
    variant = 'desktop',
    onProductClick,
    onClose,
    autoFocus = false,
}: SearchBoxProps) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [aiMode, setAiMode] = useState(false);
    const [results, setResults] = useState<ProductItem[]>([]);
    const [displayed, setDisplayed] = useState<ProductItem[]>([]);
    const [total, setTotal] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [dropdownAnim, setDropdownAnim] = useState(false);
    const { user } = useAuthStore();
    const [aiRecs, setAiRecs] = useState<ProductItem[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const aiModeRef = useRef(aiMode);
    const queryRef = useRef(query);
    const uidRef = useRef(user?.uid);
    const isOpenRef = useRef(isOpen);

    useEffect(() => { aiModeRef.current = aiMode; }, [aiMode]);
    useEffect(() => { queryRef.current = query; }, [query]);
    useEffect(() => { uidRef.current = user?.uid; }, [user?.uid]);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    const closeDropdown = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsExiting(false);
            setDisplayed([]);
        }, 220);
    }, []);

    // Subscribe to SignalR results
    useEffect(() => {
        searchHubService.onResults(async (response) => {
            let items = response.items.map(hitToProductItem);

            if (items.length > 0) {
                if (aiModeRef.current && uidRef.current) {
                    try {
                        const candidateIds = items.map(i => i.id);
                        const aiScored = await aiSearchService.rerank(
                            queryRef.current,
                            candidateIds,
                            uidRef.current,
                            items.length
                        );
                        if (aiScored.length > 0) {
                            const scoreMap = new Map(aiScored.map(i => [i.id, i.score]));
                            items.sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));
                        }
                    } catch (err) {
                        console.warn('Live search AI rerank failed, keeping Elastic order', err);
                    }
                }

                if (!queryRef.current.trim()) return;

                setResults(items);
                setTotal(response.total);

                if (!isOpenRef.current) {
                    setIsOpen(true);
                    setTimeout(() => {
                        setDropdownAnim(true);
                        setDisplayed(items.slice(0, 6));
                    }, 40);
                } else {
                    setDisplayed(items.slice(0, 6));
                }
            } else {
                setResults([]);
                setTotal(0);
                closeDropdown();
            }
        });

        return () => {
            searchHubService.disconnect();
        };
    }, [closeDropdown]);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                closeDropdown();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [closeDropdown]);

    const goToSearch = useCallback((q: string) => {
        if (!q.trim()) return;
        closeDropdown();
        setQuery('');
        onClose?.();
        const aiParam = aiMode ? '&ai=1' : '';
        navigate(`/search?q=${encodeURIComponent(q.trim())}${aiParam}`);
    }, [navigate, onClose, aiMode]);

    const fetchAiRecs = async () => {
        if (!user?.uid) return;
        try {
            // Backend /products/recommended returns fully-enriched products
            // (AI ids → viewed-category → best-sellers fallback) in one call.
            const res = await httpClient.get<{ title: string; items: ProductItem[] }>(
                ApiRoutes.productsRecommended
            );
            const items = res.data.items ?? [];

            if (items.length > 0) {
                setAiRecs(items.slice(0, 5));
                setIsOpen(true);
                setTimeout(() => setDropdownAnim(true), 40);
            }
        } catch (err) {
            console.error('Failed to fetch AI recs', err);
        }
    };

    const handleFocus = () => {
        if (!query.trim() && user?.uid) {
            if (aiRecs.length > 0) {
                if (!isOpen) {
                    setIsOpen(true);
                    setTimeout(() => setDropdownAnim(true), 40);
                }
            } else {
                fetchAiRecs();
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!val.trim()) {
            setResults([]);
            setTotal(0);
            if (aiRecs.length > 0) {
                if (!isOpen) {
                    setIsOpen(true);
                    setTimeout(() => setDropdownAnim(true), 40);
                }
            } else {
                closeDropdown();
                if (user?.uid) fetchAiRecs();
            }
            return;
        }

        if (val.trim().length < 2) return;

        debounceRef.current = setTimeout(() => {
            searchHubService.search(val.trim());
        }, 200);
    };

    const handleProductClick = (item: ProductItem) => {
        onProductClick?.(item);
        closeDropdown();
        setQuery('');
        onClose?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') goToSearch(query);
        if (e.key === 'Escape') {
            closeDropdown();
            onClose?.();
        }
    };

    return (
        <div
            ref={wrapperRef}
            className={`${styles.wrapper} ${styles[variant]}`}
        >
            <div className={styles.inputWrap}>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                    ref={inputRef}
                    className={styles.input}
                    type="text"
                    placeholder="Search sneakers, brands..."
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    autoComplete="off"
                    spellCheck={false}
                />
                {/* AI search is a signed-in feature — hide the toggle for guests. */}
                {user && (
                    <button
                        type="button"
                        className={`${styles.aiToggle} ${aiMode ? styles.aiToggleActive : ''}`}
                        onClick={() => setAiMode((v) => !v)}
                        aria-pressed={aiMode}
                        title={aiMode ? 'AI search on — press Enter to search' : 'Search with AI'}
                    >
                        <AutoAwesome />
                        AI
                    </button>
                )}

                {query && (
                    <button
                        className={styles.clear}
                        onClick={() => { 
                            setQuery(''); 
                            setResults([]);
                            setTotal(0);
                            if (aiRecs.length > 0 && user?.uid) {
                                if (!isOpen) {
                                    setIsOpen(true);
                                    setTimeout(() => setDropdownAnim(true), 40);
                                }
                            } else {
                                closeDropdown();
                                if (user?.uid) fetchAiRecs();
                            }
                            inputRef.current?.focus(); 
                        }}
                        aria-label="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>

            {isOpen && (
                <div className={`
                    ${styles.dropdown}
                    ${dropdownAnim ? styles.dropdownOpen : ''}
                    ${isExiting ? styles.dropdownExit : ''}
                    ${variant === 'mobile' ? styles.dropdownMobile : ''}
                `}>
                    <div className={styles.dropdownHeader}>
                        <span className={styles.dropdownLabel}>
                            {query ? (
                                <>{total} result{total !== 1 ? 's' : ''} for <strong>"{query}"</strong></>
                            ) : (
                                <>Recommended for you ✦ AI</>
                            )}
                        </span>
                    </div>

                    <div className={styles.list}>
                        {(query ? displayed : aiRecs).map((item, i) => (
                            <ProductChip
                                key={item.id}
                                item={item}
                                index={i}
                                onClick={handleProductClick}
                            />
                        ))}
                    </div>

                    {query && total > 6 && (
                        <div className={styles.dropdownFooter}>
                            <button
                                className={styles.seeAll}
                                onClick={() => goToSearch(query)}
                            >
                                See all {total} results →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};