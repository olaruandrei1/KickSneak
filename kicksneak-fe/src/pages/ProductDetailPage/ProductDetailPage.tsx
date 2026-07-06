import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Chip, Checkbox, FormControlLabel, Divider } from '@mui/material';
import {
    FlashOn, FavoriteBorder, Favorite,
    ShoppingBag, LocalOffer, Share,
} from '@mui/icons-material';
import { httpClient } from '../../services/axiosService';
import { ApiRoutes } from '../../services/apiRoutes';
import type { ProductDetail, SizeOption } from '../../types/product';
import { useCartStore } from '../../store/cartStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useAuthStore } from '../../store/authStore';
import { wsService } from '../../services/wsService';
import { recentlyViewedService } from '../../services/recentlyViewedService';
import { ProductImageCarousel } from './components/ProductImageCarousel';
import { SizeSelector } from './components/SizeSelector';
import { ColorwaySelector } from './components/ColorwaySelector';
import { PriceChart } from './components/PriceChart';
import { PolicyAccordion } from './components/PolicyAccordion';
import { HistoricalData } from './components/HistoricalData';
import { MakeOfferModal } from './components/MakeOfferModal';
import { Carousel } from '../../components/molecules/Carousel/Carousel';
import { ProductCard } from '../../components/atoms/ProductCard/ProductCard';
import { Spinner } from '../../components/atoms/Spinner/Spinner';
import styles from './ProductDetailPage.module.css';

export const ProductDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { addItem } = useCartStore();
    const { toggleFavorite, isFavorite } = useFavoritesStore();

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [pricePulse, setPricePulse] = useState<'up' | 'down' | null>(null);
    const [offerOpen, setOfferOpen] = useState(false);
    const [addedAnim, setAddedAnim] = useState<'cart' | 'fav' | null>(null);
    const pulseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [sizeError, setSizeError] = useState(false);


    const fav = product ? isFavorite(product.id) : false;

    useEffect(() => {
        setLoading(true);
        httpClient.get<ProductDetail>(ApiRoutes.productDetail(id ?? ''))
            .then((res) => {
                const data = res.data;
                setProduct(data);
                if (data.preferredSizeId) {
                    const pref = data.sizes.find(s => s.sizeId === data.preferredSizeId);
                    if (pref) setSelectedSize(pref);
                }
                recentlyViewedService.add(
                    {
                        id: res.data.id,
                        name: `${res.data.name} ${res.data.subtitle}`,
                        brand: res.data.brand,
                        price: res.data.price,
                        image: res.data.images[0],
                        category: res.data.category,
                    },
                    {
                        lowestAsk: res.data.price,
                        lastSale: res.data.lastSale,
                        sizes: res.data.sizes,
                        colorways: res.data.colorways,
                    }
                );
            })
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!product) return;
        wsService.connect(user?.uid ?? 'anonymous');

        const unsubPrice = wsService.on('item_price_update', ({ itemId, payload }) => {
            if (itemId !== product.id) return;
            const { price, direction } = payload as { price: number; direction: 'up' | 'down' };
            setProduct((p) => p ? { ...p, price } : p);
            setPricePulse(direction);
            if (pulseTimeout.current) clearTimeout(pulseTimeout.current);
            pulseTimeout.current = setTimeout(() => setPricePulse(null), 1100);
        });

        const unsubSizes = wsService.on('size_update', ({ itemId, payload }) => {
            if (itemId !== product.id) return;
            setProduct((p) => p ? { ...p, sizes: payload!.sizes as SizeOption[] } : p);
        });

        const unsubColors = wsService.on('color_update', ({ itemId, payload }) => {
            if (itemId !== product.id) return;
            setProduct((p) => p ? { ...p, colorways: payload!.colors as any } : p);
        });

        return () => { unsubPrice(); unsubSizes(); unsubColors(); };
    }, [product?.id]);

    const triggerAddAnim = (type: 'cart' | 'fav') => {
        setAddedAnim(type);
        setTimeout(() => setAddedAnim(null), 900);
    };

    const handleAddToCart = (): boolean => {
    if (!product) return false;
    if (!selectedSize) {
        setSizeError(true);
        setTimeout(() => setSizeError(false), 2000);
        document.querySelector('.sizeBlock')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }
    setSizeError(false);
    addItem({
        id: product.id,
        name: `${product.name} ${product.subtitle}`,
        brand: product.brand,
        price: selectedSize.price ?? product.price,
        image: product.images[0],
        category: product.category,
        size: selectedSize.label,
        quantity: 1,
        productId: product.id,
    });
    triggerAddAnim('cart');
    return true;
};

    const handleFavorite = () => {
        if (!product) return;
        toggleFavorite({
            id: product.id,
            name: `${product.name} ${product.subtitle}`,
            brand: product.brand,
            price: product.price,
            image: product.images[0],
            category: product.category,
        });
        triggerAddAnim('fav');
    };

    const handleBuyNow = () => {
        const added = handleAddToCart();
        if (added) {
            navigate('/checkout');
        }
    };

    if (loading) return <Spinner fullPage size="lg" />;
    if (!product) return null;

    const displayPrice = selectedSize?.price ?? product.price;

    return (
        <div className={styles.page}>
            <div className={styles.inner}>

                <nav className={styles.breadcrumb}>
                    {product.breadcrumbs.map((b, i) => (
                        <span key={b.href} className={styles.breadcrumbItem}>
                            {i > 0 && <span className={styles.sep}>/</span>}
                            {i < product.breadcrumbs.length - 1
                                ? <button className={styles.breadcrumbLink} onClick={() => navigate(b.href)}>{b.label}</button>
                                : <span className={styles.breadcrumbCurrent}>{b.label}</span>
                            }
                        </span>
                    ))}
                    <div className={styles.breadcrumbActions}>
                        <button className={styles.iconAction} onClick={handleFavorite}>
                            {fav
                                ? <Favorite sx={{ fontSize: 20, color: '#e05252' }} />
                                : <FavoriteBorder sx={{ fontSize: 20, color: 'var(--color-text-muted)' }} />
                            }
                        </button>
                        <button className={styles.iconAction}>
                            <Share sx={{ fontSize: 20, color: 'var(--color-text-muted)' }} />
                        </button>
                    </div>
                </nav>
                <div className={styles.mainGrid}>

                    <div className={styles.imageCol}>
                        <ProductImageCarousel images={product.images} name={product.name} />
                    </div>

                    <div className={styles.infoCol}>

                        {/* Name */}
                        <div className={styles.nameBlock}>
                            <Typography variant="h4" className={styles.productName}>
                                {product.name}
                            </Typography>
                            <Typography variant="subtitle1" className={styles.productSubtitle}>
                                {product.subtitle}
                            </Typography>
                        </div>
                        <ColorwaySelector colorways={product.colorways} activeId={product.id} />

                        <div className={styles.sizeBlock}>
                            <div className={styles.sizeHeader}>
                                <span className={styles.sizeTitle}>Size</span>
                                {selectedSize && (
                                    <span className={styles.sizeSelected}>{selectedSize.label}</span>
                                )}
                            </div>
                            <SizeSelector
                                sizes={product.sizes}
                                selected={selectedSize}
                                onSelect={setSelectedSize}
                                pricePulse={pricePulse}
                            />
                            {sizeError && (
                                <span style={{
                                    color: '#ef4444',
                                    fontSize: '0.78rem',
                                    fontFamily: 'var(--font-body)',
                                    marginTop: '6px',
                                    display: 'block',
                                    animation: 'fadeIn 0.2s ease',
                                }}>
                                    Please select a size before adding to cart.
                                </span>
                            )}
                        </div>

                        <Divider sx={{ borderColor: 'var(--color-border)' }} />

                        {/* Buy box */}
                        <div className={styles.buyBox}>
                            <div className={styles.priceBlock}>
                                <span className={styles.priceLabel}>Buy Now for</span>
                                <span className={`
                                    ${styles.price}
                                    ${pricePulse === 'up' ? styles.priceUp : ''}
                                    ${pricePulse === 'down' ? styles.priceDown : ''}
                                `}>
                                    ${displayPrice}
                                </span>
                            </div>

                            <div className={styles.actions}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<LocalOffer />}
                                    onClick={() => setOfferOpen(true)}
                                    className={styles.offerBtn}
                                    sx={{
                                        borderRadius: '100px',
                                        borderColor: 'var(--color-border)',
                                        color: 'var(--color-text)',
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 700,
                                        py: 1.3,
                                        '&:hover': { borderColor: 'var(--color-secondary)', background: 'var(--color-surface)' },
                                    }}
                                >
                                    Make Offer
                                </Button>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={handleBuyNow}
                                    sx={{
                                        borderRadius: '100px',
                                        background: 'var(--color-secondary)',
                                        color: 'var(--color-bg)',
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 700,
                                        py: 1.3,
                                        '&:hover': { background: 'var(--color-primary)' },
                                    }}
                                >
                                    Buy Now
                                </Button>
                            </div>

                            <div className={styles.secondaryActions}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={
                                        <ShoppingBag sx={{ fontSize: 18 }} />
                                    }
                                    onClick={handleAddToCart}
                                    className={addedAnim === 'cart' ? styles.addedAnim : ''}
                                    sx={{
                                        borderRadius: '100px',
                                        borderColor: 'var(--color-border)',
                                        color: 'var(--color-text)',
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 600,
                                        fontSize: '0.82rem',
                                        py: 1,
                                        '&:hover': { borderColor: 'var(--color-secondary)', background: 'var(--color-surface)' },
                                    }}
                                >
                                    {addedAnim === 'cart' ? 'Added!' : 'Add to Cart'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={
                                        fav
                                            ? <Favorite sx={{ fontSize: 18, color: '#e05252' }} />
                                            : <FavoriteBorder sx={{ fontSize: 18 }} />
                                    }
                                    onClick={handleFavorite}
                                    className={addedAnim === 'fav' ? styles.addedAnim : ''}
                                    sx={{
                                        borderRadius: '100px',
                                        borderColor: fav ? '#e05252' : 'var(--color-border)',
                                        color: fav ? '#e05252' : 'var(--color-text)',
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 600,
                                        fontSize: '0.82rem',
                                        py: 1,
                                        '&:hover': { borderColor: '#e05252', background: 'rgba(224,82,82,0.06)' },
                                    }}
                                >
                                    {addedAnim === 'fav' ? (fav ? 'Removed!' : 'Saved!') : (fav ? 'Saved' : 'Save')}
                                </Button>
                            </div>

                            <div className={styles.lastSale}>
                                Last Sale: <strong>${product.lastSale}</strong>
                            </div>
                        </div>

                        <PolicyAccordion policies={product.policies} />

                    </div>
                </div>

                <section className={styles.section}>
                    <Carousel title="Related Products">
                        {product.relatedProducts.map((p) => (
                            <ProductCard key={p.id} item={p} />
                        ))}
                    </Carousel>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Product Details</h2>
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailsMeta}>
                            {[
                                ['Style', product.details.style],
                                ['Colorway', product.details.colorway],
                                ['Retail Price', `$${product.details.retailPrice}`],
                                ['Release Date', product.details.releaseDate],
                                ['Accessories', product.details.accessories],
                            ].map(([label, value]) => (
                                <div key={label} className={styles.detailRow}>
                                    <span className={styles.detailLabel}>{label}</span>
                                    <span className={styles.detailValue}>{value}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.description}>
                            <h3 className={styles.descTitle}>Product Description</h3>
                            {product.details.description.split('\n\n').map((para, i) => (
                                <p key={i} className={styles.descPara}>{para}</p>
                            ))}
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <Carousel title="Recently Viewed">
                        {[...recentlyViewedService.getCards()]
                            .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
                            .slice(0, 10)
                            .map((p) => (
                                <ProductCard key={p.id} item={p} />
                            ))
                        }
                    </Carousel>
                </section>

                <section className={styles.section}>
                    <PriceChart data={product.priceHistory} currentPrice={product.price} />
                </section>

                <section className={styles.section}>
                    <HistoricalData data={product.historicalData} />
                </section>

                <section className={styles.trustGrid}>
                    {[
                        { icon: '⚙', title: 'Our Process', text: product.policies.ourProcess.content.slice(0, 80) + '...' },
                        { icon: '🛡', title: 'Buyer Promise', text: product.policies.buyerPromise.content },
                        { icon: '🏪', title: 'Start Selling', text: 'You can start selling on KickSneak in just a few clicks, no application process necessary.' },
                    ].map((c) => (
                        <div key={c.title} className={styles.trustCard}>
                            <span className={styles.trustIcon}>{c.icon}</span>
                            <span className={styles.trustTitle}>{c.title}</span>
                            <span className={styles.trustText}>{c.text}</span>
                        </div>
                    ))}
                </section>

            </div>

            <MakeOfferModal
                open={offerOpen}
                onClose={() => setOfferOpen(false)}
                productName={`${product.name} ${product.subtitle}`}
                lowestAsk={displayPrice}
                selectedSize={selectedSize?.label ?? 'All'}
            />
        </div>
    );
};