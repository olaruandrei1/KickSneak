import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cachedFetch } from '../../services/cachedFetchService';
import { ApiRoutes } from '../../services/apiRoutes';
import { Spinner } from '../../components/atoms/Spinner/Spinner';
import styles from './BrandsPage.module.css';

interface Brand {
    id: string;
    name: string;
    slug: string;
    logo: string;
    productCount: number;
    category: string;
}

interface BrandsData {
    featured: Brand[];
    luxury: Brand[];
    apparel: Brand[];
}

const BrandCard = ({ brand, onClick }: { brand: Brand; onClick: () => void }) => (
    <button className={styles.brandCard} onClick={onClick}>
        <div className={styles.logoWrap}>
            <img
                src={brand.logo}
                alt={brand.name}
                className={styles.logo}
            />
        </div>
        <div className={styles.brandInfo}>
            <span className={styles.brandName}>{brand.name}</span>
            <span className={styles.brandCount}>{brand.productCount.toLocaleString()} products</span>
        </div>
    </button>
);

export const BrandsPage = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<BrandsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        cachedFetch<BrandsData>({
            key: 'brands_data',
            url: ApiRoutes.brands,
            onData: (d) => {
                if (Array.isArray(d)) {
                    setData({ featured: d as any, luxury: [], apparel: [] });
                } else {
                    setData(d);
                }
                setLoading(false);
            },
        }).finally(() => setLoading(false));
    }, []);

    const goToBrand = (slug: string) => navigate(`/search?brand=${slug}`);

    const filterBrands = (brands: Brand[]) =>
        search.trim()
            ? brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
            : brands;

    if (loading) return <Spinner fullPage size="lg" />;
    if (!data) return null;

    const allFiltered = search.trim()
        ? [...data.featured, ...data.luxury, ...data.apparel].filter(
            (b) => b.name.toLowerCase().includes(search.toLowerCase())
        )
        : null;

    return (
        <div className={styles.page}>
            <div className={styles.inner}>

                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.title}>All Brands</h1>
                    <p className={styles.subtitle}>
                        {[...data.featured, ...data.luxury, ...data.apparel].length} brands available
                    </p>
                </div>

                {/* Search */}
                <div className={styles.searchWrap}>
                    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input
                        className={styles.searchInput}
                        placeholder="Search brands..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
                    )}
                </div>

                {/* Search results */}
                {allFiltered ? (
                    allFiltered.length === 0 ? (
                        <div className={styles.empty}>No brands found for "{search}"</div>
                    ) : (
                        <div className={styles.grid}>
                            {allFiltered.map((b) => (
                                <BrandCard key={b.id} brand={b} onClick={() => goToBrand(b.slug)} />
                            ))}
                        </div>
                    )
                ) : (
                    <>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <span className={styles.sectionDot} />
                                Popular Brands
                            </h2>
                            <div className={styles.grid}>
                                {filterBrands(data.featured).map((b) => (
                                    <BrandCard key={b.id} brand={b} onClick={() => goToBrand(b.slug)} />
                                ))}
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <span className={styles.sectionDot} style={{ background: '#a78bfa' }} />
                                Luxury
                            </h2>
                            <div className={styles.grid}>
                                {filterBrands(data.luxury).map((b) => (
                                    <BrandCard key={b.id} brand={b} onClick={() => goToBrand(b.slug)} />
                                ))}
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <span className={styles.sectionDot} style={{ background: '#f472b6' }} />
                                Apparel
                            </h2>
                            <div className={styles.grid}>
                                {filterBrands(data.apparel).map((b) => (
                                    <BrandCard key={b.id} brand={b} onClick={() => goToBrand(b.slug)} />
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};