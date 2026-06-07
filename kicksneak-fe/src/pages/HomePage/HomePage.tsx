import { useEffect, useState } from 'react';
import { cachedFetch } from '../../services/cachedFetchService';
import { ApiRoutes } from '../../services/apiRoutes';
import type { ProductItem } from '../../types/product';
import { ProductCard } from '../../components/atoms/ProductCard/ProductCard';
import { CarouselSection } from './components/CarouselSection';
import { Spinner } from '../../components/atoms/Spinner/Spinner';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

interface CarouselData {
    title: string;
    items: ProductItem[];
}

const CAROUSEL_ROUTES = [
    { key: 'home_new', url: ApiRoutes.productsNew, cacheKey: 'home_new' },
    { key: 'home_trending', url: ApiRoutes.productsTrending, cacheKey: 'home_trending' },
    { key: 'home_rec', url: ApiRoutes.productsRecommended, cacheKey: 'home_rec' },
    { key: 'home_recent', url: ApiRoutes.productsRecentlyViewed, cacheKey: 'home_recent' },
];

export const HomePage = () => {
    const [carousels, setCarousels] = useState<Record<string, CarouselData>>({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let loaded = 0;
        CAROUSEL_ROUTES.forEach(({ key, url, cacheKey }) => {
            cachedFetch<CarouselData>({
                key: cacheKey,
                url,
                onData: (data, source) => {
                    setCarousels((prev) => ({ ...prev, [key]: data }));
                    if (source === 'cache' || source === 'api') {
                        loaded++;
                        if (loaded >= 1) setLoading(false);
                    }
                },
            });
        });
    }, []);

    if (loading && Object.keys(carousels).length === 0) {
        return <Spinner fullPage size="lg" />;
    }

    return (
        <main className={styles.page}>
            <div className={styles.inner}>
                <section className={styles.hero}>
                    <div className={styles.heroText}>
                        <span className={styles.heroEyebrow}>New Arrivals</span>
                        <h1 className={styles.heroTitle}>
                            The World's<br />
                            <em>Freshest</em> Kicks
                        </h1>
                        <p className={styles.heroSub}>
                            Authenticated sneakers, apparel & collectibles.
                            Buy and sell with confidence.
                        </p>
                        <div className={styles.heroActions}>
                            <button className={styles.heroCta} onClick={() => navigate('/search')}>
                                Shop Now
                            </button>
                            <button className={styles.heroSecondary} onClick={() => navigate('/auctions')}>
                                View Auctions
                            </button>
                        </div>
                    </div>
                    <div className={styles.heroImage}>
                        <img
                            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=85"
                            alt="Featured sneaker"
                        />
                        <div className={styles.heroBadge}>
                            <span className={styles.heroBadgeNum}>10K+</span>
                            <span className={styles.heroBadgeLabel}>Active Listings</span>
                        </div>
                    </div>
                </section>

                <section className={styles.carousels}>
                    {CAROUSEL_ROUTES.map(({ key }, i) => {
                        const data = carousels[key];
                        if (!data) return null;
                        return (
                            <CarouselSection
                                key={key}
                                title={data.title}
                                sectionIndex={i}
                            >
                                {data.items.map((item) => (
                                    <ProductCard key={item.id} item={item} />
                                ))}
                            </CarouselSection>
                        );
                    })}
                </section>

            </div>
        </main>
    );
};