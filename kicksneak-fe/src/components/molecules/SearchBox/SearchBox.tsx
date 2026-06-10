import {
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductItem } from '../../../types/product';
import { ProductChip } from '../../atoms/ProductChip/ProductChip';
import { searchHubService, type SearchHit } from '../../../services/searchHubService';
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
    const [results, setResults] = useState<ProductItem[]>([]);
    const [displayed, setDisplayed] = useState<ProductItem[]>([]);
    const [total, setTotal] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [dropdownAnim, setDropdownAnim] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Subscribe to SignalR results
    useEffect(() => {
        searchHubService.onResults((response) => {
            const items = response.items.map(hitToProductItem);
            setResults(items);
            setTotal(response.total);

            if (items.length > 0) {
                if (!isOpen) {
                    setIsOpen(true);
                    setTimeout(() => {
                        setDropdownAnim(true);
                        setDisplayed(items.slice(0, 6));
                    }, 40);
                } else {
                    setDisplayed(items.slice(0, 6));
                }
            } else {
                closeDropdown();
            }
        });

        return () => {
            searchHubService.disconnect();
        };
    }, [isOpen]);

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
    }, []);

    const closeDropdown = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsExiting(false);
            setDisplayed([]);
        }, 220);
    };

    const goToSearch = useCallback((q: string) => {
        if (!q.trim()) return;
        closeDropdown();
        setQuery('');
        onClose?.();
        navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    }, [navigate, onClose]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!val.trim()) {
            closeDropdown();
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
                    autoComplete="off"
                    spellCheck={false}
                />
                {query && (
                    <button
                        className={styles.clear}
                        onClick={() => { setQuery(''); closeDropdown(); }}
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
                            {total} result{total !== 1 ? 's' : ''} for
                            <strong> "{query}"</strong>
                        </span>
                    </div>

                    <div className={styles.list}>
                        {displayed.map((item, i) => (
                            <ProductChip
                                key={item.id}
                                item={item}
                                index={i}
                                onClick={handleProductClick}
                            />
                        ))}
                    </div>

                    {total > 6 && (
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