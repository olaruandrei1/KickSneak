import { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Box } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useCartStore } from '../../store/cartStore';
import { wsService } from '../../services/wsService';
import { useAuthStore } from '../../store/authStore';
import { httpClient } from '../../services/axiosService';
import { ApiRoutes } from '../../services/apiRoutes';
import { ProductCard } from '../../components/atoms/ProductCard/ProductCard';
import { ProductGrid } from '../../components/molecules/ProductGrid/ProductGrid';
import type { ProductItem } from '../../types/product';
import styles from './FavoritesPage.module.css';
import { AppModal } from '../../components/molecules/AppModal/AppModal';

interface SizeOption {
    label: string;
    price: number;
}

export const FavoritesPage = () => {
    const navigate = useNavigate();
    const { items, fetchFavorites, toggleFavorite } = useFavoritesStore();
    const { addItem } = useCartStore();
    const { user } = useAuthStore();

    const [sizeModalItem, setSizeModalItem] = useState<ProductItem | null>(null);
    const [sizes, setSizes] = useState<SizeOption[]>([]);
    const [loadingSizes, setLoadingSizes] = useState(false);

    useEffect(() => {
        fetchFavorites();
    }, []);

    useEffect(() => {
        if (!user) return;
        wsService.connect(user.uid);
        const unsub = wsService.on('item_unavailable', ({ itemId }) => {
            const item = items.find((i) => i.id === itemId);
            if (item) toggleFavorite(item);
        });
        return unsub;
    }, [user, items]);

    const handleCartAdd = async (item: ProductItem) => {
        setLoadingSizes(true);
        setSizeModalItem(item);
        try {
            const res = await httpClient.get<{ sizes: SizeOption[] }>(
                ApiRoutes.productDetail(item.id)
            );
            setSizes(res.data.sizes.filter(s => s.price != null));
        } finally {
            setLoadingSizes(false);
        }
    };

    const handleSizeSelect = (sizeLabel: string, price: number) => {
        if (!sizeModalItem) return;
        addItem({
            ...sizeModalItem,
            size: sizeLabel,
            price,
            quantity: 1,
            productId: sizeModalItem.id,
        });
        setSizeModalItem(null);
        setSizes([]);
    };

    return (
        <main className={styles.page}>
            <div className={styles.inner}>
                <Box className={styles.header}>
                    <Typography variant="h4" className={styles.title}>
                        My Favorites
                    </Typography>
                    <Typography variant="body2" className={styles.subtitle}>
                        {items.length} {items.length === 1 ? 'item' : 'items'} saved
                    </Typography>
                </Box>

                <ProductGrid
                    totalCount={items.length}
                    defaultMode="list"
                    showModeSwitch={false}
                    showSort
                    emptyState={
                        <Box className={styles.empty}>
                            <FavoriteBorderIcon sx={{ fontSize: 56, color: 'var(--color-text-muted)', mb: 2 }} />
                            <Typography variant="h6" sx={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                                No favorites yet
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 1 }}>
                                Browse products and hit the heart icon to save them here.
                            </Typography>
                        </Box>
                    }
                >
                    {items.map((item) => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            mode="list"
                            showCartAction
                            showDeleteAction
                            onDelete={(id) => {
                                const found = items.find((i) => i.id === id);
                                if (found) toggleFavorite(found);
                            }}
                            onCartAdd={() => handleCartAdd(item)}
                        />
                    ))}
                </ProductGrid>

                <AppModal
                    open={!!sizeModalItem}
                    onClose={() => { setSizeModalItem(null); setSizes([]); }}
                    title={`Select Size — ${sizeModalItem?.name ?? ''}`}
                    maxWidth="xs"
                >
                    {loadingSizes ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                            Loading sizes...
                        </div>
                    ) : sizes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                            No sizes available.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px 0' }}>
                            {sizes.map((s) => (
                                <button
                                    key={s.label}
                                    onClick={() => handleSizeSelect(s.label, s.price)}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-text)',
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 600,
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {s.label} — ${s.price}
                                </button>
                            ))}
                        </div>
                    )}
                </AppModal>
            </div>
        </main>
    );
};