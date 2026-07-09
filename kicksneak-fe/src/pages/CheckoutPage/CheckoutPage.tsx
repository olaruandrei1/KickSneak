import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, MenuItem, Stepper, Step, StepLabel, Radio, CircularProgress } from '@mui/material';
import { Home, Business, Add, Lock } from '@mui/icons-material';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { httpClient } from '../../services/axiosService';
import { ApiRoutes } from '../../services/apiRoutes';
import { GlassCard } from '../ProfilePage/components/sections/GlassCard';
import styles from './CheckoutPage.module.css';

interface UserAddressDto {
    id?: string;
    addressName?: string;
    isPrincipal: boolean;
    firstName?: string;
    lastName?: string;
    country?: string;
    city?: string;
    county?: string;
    street?: string;
    streetNumber?: string;
    postalCode?: string;
    phone?: string;
}

const STEPS = ['Shipping', 'Review'];

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { items } = useCartStore();
    const [step, setStep] = useState(0);
    const [placing, setPlacing] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState<UserAddressDto[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [useNewAddress, setUseNewAddress] = useState(false);

    const [shipping, setShipping] = useState({
        firstName: '', lastName: '', street: '',
        city: '', county: '', zip: '', country: 'Romania', phone: '',
    });

    useEffect(() => {
        if (items.length === 0) navigate('/cart');
    }, [items]);

    useEffect(() => {
        httpClient.get<UserAddressDto[]>(ApiRoutes.profileAddresses())
            .then((r) => {
                const addresses = r.data ?? [];
                setSavedAddresses(addresses);
                const def = addresses.find((a) => a.isPrincipal) ?? addresses[0];
                if (def) {
                    setSelectedAddressId(def.id ?? null);
                    setShipping({
                        firstName: def.firstName ?? '',
                        lastName: def.lastName ?? '',
                        street: `${def.street ?? ''} ${def.streetNumber ?? ''}`.trim(),
                        city: def.city ?? '',
                        county: def.county ?? '',
                        zip: def.postalCode ?? '',
                        country: def.country ?? 'Romania',
                        phone: def.phone ?? '',
                    });
                } else {
                    setUseNewAddress(true);
                }
            })
            .catch(() => setUseNewAddress(true));
    }, []);

    const handleSelectAddress = (addr: UserAddressDto) => {
        setSelectedAddressId(addr.id ?? null);
        setUseNewAddress(false);
        setShipping({
            firstName: addr.firstName ?? '',
            lastName: addr.lastName ?? '',
            street: `${addr.street ?? ''} ${addr.streetNumber ?? ''}`.trim(),
            city: addr.city ?? '',
            county: addr.county ?? '',
            zip: addr.postalCode ?? '',
            country: addr.country ?? 'Romania',
            phone: addr.phone ?? '',
        });
    };

    const subtotal = items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0);
    const shippingFee = subtotal > 200 ? 0 : 12;
    const vat = Math.round(subtotal * 0.19 * 100) / 100;
    const total = subtotal + shippingFee + vat;

    const handlePlaceOrder = async () => {
        setPlacing(true);
        try {
            const res = await httpClient.post<{ url: string }>(ApiRoutes.checkoutSession, {
                cartItemIds: items.map((i) => i.id),
                addressId: selectedAddressId ?? null,
                successUrl: `${window.location.origin}/checkout/success`,
                cancelUrl: `${window.location.origin}/checkout`,
                shippingAddress: useNewAddress ? {
                    firstName: shipping.firstName,
                    lastName: shipping.lastName,
                    street: shipping.street,
                    city: shipping.city,
                    county: shipping.county,
                    postalCode: shipping.zip,
                    country: shipping.country,
                    phone: shipping.phone,
                } : null,
            });
            window.location.href = res.data.url;
        } catch {
            setPlacing(false);
            useNotificationStore.getState().addNew({ id: Date.now().toString(), type: 'system', title: 'Error', message: 'Failed to place order. Please try again.', href: '/checkout', read: false, createdAt: new Date().toISOString() });
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.inner}>
                <div className={styles.formCol}>
                    <h1 className={styles.title}>Checkout</h1>

                    <Stepper activeStep={step} sx={{ mb: 3 }}>
                        {STEPS.map((label) => (
                            <Step key={label}>
                                <StepLabel sx={{
                                    '& .MuiStepLabel-label': { fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--color-text-muted)' },
                                    '& .MuiStepLabel-label.Mui-active': { color: 'var(--color-accent)' },
                                    '& .MuiStepLabel-label.Mui-completed': { color: 'var(--color-accent)' },
                                    '& .MuiStepIcon-root': { color: 'var(--color-border)' },
                                    '& .MuiStepIcon-root.Mui-active': { color: 'var(--color-secondary)' },
                                    '& .MuiStepIcon-root.Mui-completed': { color: 'var(--color-accent)' },
                                }}>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {/* Step 0 — Shipping */}
                    {step === 0 && (
                        <GlassCard>
                            <h3 className={styles.stepTitle}>Shipping Address</h3>

                            {savedAddresses.length > 0 && (
                                <div className={styles.savedAddresses}>
                                    {savedAddresses.map((addr) => (
                                        <div
                                            key={addr.id}
                                            className={`${styles.addrOption} ${selectedAddressId === addr.id && !useNewAddress ? styles.addrOptionSelected : ''}`}
                                            onClick={() => handleSelectAddress(addr)}
                                        >
                                            <Radio
                                                checked={selectedAddressId === addr.id && !useNewAddress}
                                                size="small"
                                                sx={{ color: 'var(--color-border)', '&.Mui-checked': { color: 'var(--color-secondary)' }, p: 0, mr: 1 }}
                                            />
                                            {addr.addressName === 'Home'
                                                ? <Home sx={{ fontSize: 16, color: 'var(--color-accent)', mr: 0.5 }} />
                                                : <Business sx={{ fontSize: 16, color: 'var(--color-accent)', mr: 0.5 }} />
                                            }
                                            <div className={styles.addrOptionInfo}>
                                                <span className={styles.addrOptionLabel}>
                                                    {addr.addressName} — {addr.firstName} {addr.lastName}
                                                </span>
                                                <span className={styles.addrOptionText}>
                                                    {addr.street} {addr.streetNumber}, {addr.city} {addr.postalCode}
                                                </span>
                                            </div>
                                            {addr.isPrincipal && (
                                                <span className={styles.defaultBadge}>Default</span>
                                            )}
                                        </div>
                                    ))}

                                    <div
                                        className={`${styles.addrOption} ${useNewAddress ? styles.addrOptionSelected : ''}`}
                                        onClick={() => { setUseNewAddress(true); setSelectedAddressId(null); }}
                                    >
                                        <Radio
                                            checked={useNewAddress}
                                            size="small"
                                            sx={{ color: 'var(--color-border)', '&.Mui-checked': { color: 'var(--color-secondary)' }, p: 0, mr: 1 }}
                                        />
                                        <Add sx={{ fontSize: 16, color: 'var(--color-text-muted)', mr: 0.5 }} />
                                        <span className={styles.addrOptionLabel}>Use a different address</span>
                                    </div>
                                </div>
                            )}

                            {(useNewAddress || savedAddresses.length === 0) && (
                                <div className={styles.formGrid}>
                                    {[
                                        { key: 'firstName', label: 'First Name' },
                                        { key: 'lastName', label: 'Last Name' },
                                        { key: 'street', label: 'Street Address', full: true },
                                        { key: 'city', label: 'City' },
                                        { key: 'county', label: 'County' },
                                        { key: 'zip', label: 'ZIP Code' },
                                        { key: 'phone', label: 'Phone' },
                                    ].map(({ key, label, full }) => (
                                        <TextField
                                            key={key}
                                            label={label}
                                            value={(shipping as any)[key]}
                                            onChange={(e) => setShipping((s) => ({ ...s, [key]: e.target.value }))}
                                            size="small"
                                            fullWidth
                                            sx={{ ...(full ? { gridColumn: '1 / -1' } : {}), ...sxField }}
                                        />
                                    ))}
                                    <TextField
                                        select label="Country" value={shipping.country}
                                        onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                                        size="small" fullWidth sx={sxField}
                                    >
                                        {['Romania', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'UK'].map((c) => (
                                            <MenuItem key={c} value={c}>{c}</MenuItem>
                                        ))}
                                    </TextField>
                                </div>
                            )}

                            <button className={styles.nextBtn} onClick={() => setStep(1)}>
                                Review Order →
                            </button>
                        </GlassCard>
                    )}

                    {/* Step 1 — Review */}
                    {step === 1 && (
                        <GlassCard>
                            <h3 className={styles.stepTitle}>Review Order</h3>

                            <div className={styles.reviewSection}>
                                <span className={styles.reviewLabel}>Shipping to</span>
                                <p className={styles.reviewText}>
                                    {shipping.firstName} {shipping.lastName}<br />
                                    {shipping.street}, {shipping.city} {shipping.zip}<br />
                                    {shipping.country} · {shipping.phone}
                                </p>
                            </div>

                            <div className={styles.reviewSection}>
                                <span className={styles.reviewLabel}>Items ({items.length})</span>
                                {items.map((item, i) => (
                                    <div key={i} className={styles.reviewItem}>
                                        <img src={item.image} alt={item.name} className={styles.reviewItemImg} />
                                        <div className={styles.reviewItemInfo}>
                                            <span className={styles.reviewItemName}>{item.name}</span>
                                            <span className={styles.reviewItemMeta}>Size: {item.size} · Qty: {item.quantity ?? 1}</span>
                                        </div>
                                        <span className={styles.reviewItemPrice}>${item.price}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.btnRow}>
                                <button className={styles.backBtn} onClick={() => setStep(0)}>← Back</button>
                                <button
                                    className={styles.placeBtn}
                                    onClick={handlePlaceOrder}
                                    disabled={placing}
                                >
                                    {placing
                                        ? <><CircularProgress size={14} sx={{ color: '#fff', mr: 1 }} /> Redirecting...</>
                                        : `Pay with Stripe · $${total.toFixed(2)}`
                                    }
                                </button>
                            </div>
                        </GlassCard>
                    )}
                </div>

                {/* Order Summary */}
                <div className={styles.summaryCol}>
                    <GlassCard>
                        <h3 className={styles.stepTitle}>Order Summary</h3>
                        <div className={styles.itemsList}>
                            {items.map((item, i) => (
                                <div key={i} className={styles.itemRow}>
                                    <img src={item.image} alt={item.name} className={styles.itemImg} />
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>{item.name}</span>
                                        <span className={styles.itemMeta}>Size: {item.size} · Qty: {item.quantity ?? 1}</span>
                                    </div>
                                    <span className={styles.itemPrice}>${item.price}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.totals}>
                            <div className={styles.totalRow}>
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className={styles.totalRow}>
                                <span>Shipping</span>
                                <span className={shippingFee === 0 ? styles.free : ''}>
                                    {shippingFee === 0 ? 'FREE' : `$${shippingFee}`}
                                </span>
                            </div>
                            <div className={styles.totalRow}>
                                <span>VAT (19%)</span>
                                <span>${vat.toFixed(2)}</span>
                            </div>
                            <div className={`${styles.totalRow} ${styles.totalRowFinal}`}>
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

const sxField = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '10px', background: 'var(--color-surface)', color: 'var(--color-text)',
        '& fieldset': { borderColor: 'var(--color-border)' },
        '&:hover fieldset': { borderColor: 'var(--color-secondary)' },
        '&.Mui-focused fieldset': { borderColor: 'var(--color-accent)' },
    },
    '& .MuiInputLabel-root': { color: 'var(--color-text-muted)', fontSize: '0.85rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-accent)' },
    '& input': { color: 'var(--color-text)', fontSize: '0.85rem' },
};

export default CheckoutPage;