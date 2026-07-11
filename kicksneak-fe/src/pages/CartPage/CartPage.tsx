import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Typography, Box, Paper, Divider,
    Button, Chip, Alert,
} from '@mui/material';
import {
  ShoppingBagOutlined as ShoppingBagOutlinedIcon,
  LockOutlined as LockOutlinedIcon,
  LocalShippingOutlined as LocalShippingOutlinedIcon,
  Verified as VerifiedOutlinedIcon,
  DeleteOutlined as DeleteOutlineIcon,
} from '@mui/icons-material';
import { useCartStore } from '../../store/cartStore';
import { wsService } from '../../services/wsService';
import { useAuthStore } from '../../store/authStore';
import { ProductCard } from '../../components/atoms/ProductCard/ProductCard';
import { ProductGrid } from '../../components/molecules/ProductGrid/ProductGrid';
import styles from './CartPage.module.css';

const VAT_RATE = 0.19;
const SHIPPING_FEE = 15;
const FREE_SHIP_ABOVE = 300;

export const CartPage = () => {
    const navigate = useNavigate();
    const { items, fetchCart, removeItem } = useCartStore();
    const { user } = useAuthStore();

    useEffect(() => { fetchCart(); }, []);

    useEffect(() => {
        if (!user) return;
        wsService.connect(user.uid);
        const unsub = wsService.on('item_unavailable', ({ itemId }) => {
            removeItem(itemId);
        });
        return unsub;
    }, [user]);

    // Guests must sign in before paying; send them back to the cart afterwards
    // (their items are merged into the account on login).
    const goToCheckout = () => {
        if (!user) {
            sessionStorage.setItem('post_login_redirect', '/cart');
            navigate('/login');
            return;
        }
        navigate('/checkout');
    };

    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping = subtotal >= FREE_SHIP_ABOVE ? 0 : SHIPPING_FEE;
    const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
    const total = subtotal + shipping + vat;

    return (
        <main className={styles.page}>
            <div className={styles.inner}>

                <Typography variant="h4" className={styles.title}>
                    My Cart
                    {items.length > 0 && (
                        <Chip
                            label={items.length}
                            size="small"
                            sx={{
                                ml: 1.5,
                                background: 'var(--color-secondary)',
                                color: 'var(--color-bg)',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                            }}
                        />
                    )}
                </Typography>

                {items.length === 0 ? (
                    <Box className={styles.empty}>
                        <ShoppingBagOutlinedIcon sx={{ fontSize: 56, color: 'var(--color-text-muted)', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                            Your cart is empty
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', mt: 1, mb: 3 }}>
                            Add some sneakers to get started.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/')}
                            sx={{
                                borderRadius: '100px',
                                background: 'var(--color-secondary)',
                                fontFamily: 'var(--font-display)',
                                px: 3,
                            }}
                        >
                            Browse Products
                        </Button>
                    </Box>
                ) : (
                    <div className={styles.layout}>

                        {/* Stanga — lista produse */}
                        <div className={styles.itemsCol}>
                            <ProductGrid
                                defaultMode="list"
                                showModeSwitch={false}
                                showSort={false}
                            >
                                {items.map((item) => (
                                    <div key={item.id} className={styles.cartItem}>
                                        <ProductCard
                                            item={item}
                                            mode="list"
                                        />
                                        <div className={styles.cartItemMeta}>
                                            <span className={styles.size}>Size: <strong>{item.size}</strong></span>
                                            <span className={styles.qty}>Qty: <strong>{item.quantity}</strong></span>
                                            <button
                                                className={styles.removeBtn}
                                                onClick={() => removeItem(item.id)}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </ProductGrid>
                        </div>

                        {/* Dreapta — summary */}
                        <div className={styles.summaryCol}>
                            <Paper
                                elevation={0}
                                className={styles.summaryCard}
                            >
                                <Typography variant="h6" className={styles.summaryTitle}>
                                    Order Summary
                                </Typography>

                                <div className={styles.summaryRows}>
                                    <div className={styles.summaryRow}>
                                        <span>Subtotal ({items.length} items)</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className={styles.summaryRow}>
                                        <span>Shipping</span>
                                        <span className={shipping === 0 ? styles.free : ''}>
                                            {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className={styles.summaryRow}>
                                        <span>VAT (19%)</span>
                                        <span>${vat.toFixed(2)}</span>
                                    </div>
                                    <Divider sx={{ borderColor: 'var(--color-border)', my: 1 }} />
                                    <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                        <span>Total</span>
                                        <span>${total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {subtotal < FREE_SHIP_ABOVE && (
                                    <Alert
                                        severity="info"
                                        icon={<LocalShippingOutlinedIcon fontSize="small" />}
                                        sx={{
                                            mt: 2,
                                            borderRadius: '10px',
                                            background: 'var(--color-surface)',
                                            color: 'var(--color-text)',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '0.78rem',
                                            fontFamily: 'var(--font-body)',
                                            '& .MuiAlert-icon': { color: 'var(--color-accent)' },
                                        }}
                                    >
                                        Add <strong>${(FREE_SHIP_ABOVE - subtotal).toFixed(2)}</strong> more for free shipping
                                    </Alert>
                                )}

                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    startIcon={<LockOutlinedIcon />}
                                    onClick={goToCheckout}
                                    sx={{
                                        mt: 2.5,
                                        borderRadius: '100px',
                                        background: 'var(--color-secondary)',
                                        color: 'var(--color-bg)',
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        py: 1.4,
                                        '&:hover': { background: 'var(--color-primary)', opacity: 0.9 },
                                    }}
                                >
                                    Continue to Payment
                                </Button>

                                <div className={styles.trust}>
                                    <div className={styles.trustItem}>
                                        <VerifiedOutlinedIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                                        <span>100% Authenticated</span>
                                    </div>
                                    <div className={styles.trustItem}>
                                        <LocalShippingOutlinedIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                                        <span>Free returns</span>
                                    </div>
                                    <div className={styles.trustItem}>
                                        <LockOutlinedIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                                        <span>Secure checkout</span>
                                    </div>
                                </div>
                            </Paper>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};