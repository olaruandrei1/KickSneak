import { useEffect, useState } from 'react';
import { cachedFetch } from '../../services/cachedFetchService';
import { httpClient } from '../../services/axiosService';
import { ApiRoutes } from '../../services/apiRoutes';
import { useAuthStore } from '../../store/authStore';
import type { ProductItem } from '../../types/product';
import { ProductCard } from '../../components/atoms/ProductCard/ProductCard';
import { CarouselSection } from './components/CarouselSection';
import { recentlyViewedService } from '../../services/recentlyViewedService';
import { Spinner } from '../../components/atoms/Spinner/Spinner';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

interface CarouselData {
    title: string;
    items: ProductItem[];
}

const CAROUSEL_ROUTES = [
    { key: 'home_new', title: 'New Arrivals', url: ApiRoutes.productsNew, cacheKey: 'home_new' },
    { key: 'home_trending', title: 'Trending Kicks', url: ApiRoutes.productsTrending, cacheKey: 'home_trending' },
    { key: 'home_recent', title: 'Recently Viewed', url: ApiRoutes.productsRecentlyViewed, cacheKey: 'home_recent' },
];

export const HomePage = () => {
    const [carousels, setCarousels] = useState<Record<string, CarouselData>>({});
    const [aiRecommendations, setAiRecommendations] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Guest-only fallback for the "Recently Viewed" rail (logged-in users get it
    // from the server via CAROUSEL_ROUTES.home_recent).
    const guestRecentlyViewed = user?.uid
        ? []
        : recentlyViewedService.getCards()
            .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
            .slice(0, 10);

    // ── Standard carousels (Elastic/DB) ──
    useEffect(() => {
        let loaded = 0;
        // home_recent is an auth-only endpoint (401 for guests) — guests get
        // their locally tracked rail instead, so skip the server fetch entirely.
        const routes = user?.uid
            ? CAROUSEL_ROUTES
            : CAROUSEL_ROUTES.filter((r) => r.key !== 'home_recent');
        routes.forEach(({ key, url, cacheKey }) => {
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
    }, [user?.uid]);

    // ── AI Recommendations ──
    // Backend /products/recommended does the whole pipeline server-side:
    // neural-net ids (Flask) → full product data, falling back to viewed-category
    // picks and finally best-sellers when the user has no activity yet.
    useEffect(() => {
        if (!user?.uid) return;

        const fetchAiRecs = async () => {
            try {
                const res = await httpClient.get<{ title: string; items: ProductItem[] }>(
                    ApiRoutes.productsRecommended
                );
                setAiRecommendations(res.data.items ?? []);
            } catch {
                // Recommendations are best-effort — hide the section on failure.
            }
        };

        fetchAiRecs();
    }, [user?.uid]);

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
                    {/* AI recommendations sit at the top for signed-in users. The list is
                        only ever populated when a user is logged in (fetch is gated on
                        user?.uid), so guests never see this section. */}
                    {user?.uid && aiRecommendations.length > 0 && (
                        <CarouselSection
                            title="Recommended For You ✦ AI"
                            sectionIndex={0}
                        >
                            {aiRecommendations.map((item) => (
                                <ProductCard key={item.id} item={item} />
                            ))}
                        </CarouselSection>
                    )}

                    {CAROUSEL_ROUTES.map(({ key, title }, i) => {
                        // Guests use the local recently-viewed rail below instead.
                        if (key === 'home_recent' && !user?.uid) return null;
                        const data = carousels[key];
                        if (!data) return null;
                        const items = Array.isArray(data) ? data : data.items ?? [];
                        // An empty carousel renders as a lonely heading — skip it.
                        if (items.length === 0) return null;
                        return (
                            <CarouselSection
                                key={key}
                                title={data.title || title}
                                sectionIndex={i + 1}
                            >
                                {items.map((item) => (
                                    <ProductCard key={item.id} item={item} />
                                ))}
                            </CarouselSection>
                        );
                    })}

                    {/* Guests have no server-side history, so surface their locally
                        tracked recently-viewed items here too. */}
                    {!user?.uid && guestRecentlyViewed.length > 0 && (
                        <CarouselSection
                            title="Recently Viewed"
                            sectionIndex={CAROUSEL_ROUTES.length + 1}
                        >
                            {guestRecentlyViewed.map((item) => (
                                <ProductCard key={item.id} item={item} />
                            ))}
                        </CarouselSection>
                    )}
                </section>
            </div>
        </main>
    );
};