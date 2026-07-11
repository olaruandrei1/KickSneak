import { useEffect, useState, useRef } from 'react';
import { Chip, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem } from '@mui/material';
import { Add, Edit, Gavel, Visibility, CloudUpload, Search, Close } from '@mui/icons-material';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import { GlassCard } from './GlassCard';
import type { UserProfile } from '../../../../types/profile';
import styles from './SellerListingsSection.module.css';

interface Listing {
    id: string; name: string; brand: string;
    size: string; price: number; status: string;
    views: number; image: string; listedAt: string;
    inAuction: boolean;
}

interface CatalogProduct {
    id: string; name: string; brand: string;
    image: string; retailPrice: number;
}

interface Props {
    profile: UserProfile;
    onProfileUpdate: (p: UserProfile) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: '#22c55e' },
    sold: { label: 'Sold', color: 'var(--color-text-muted)' },
    pendingreview: { label: 'Pending', color: '#f59e0b' },
    inactive: { label: 'Inactive', color: '#ef4444' },
};

const SIZES = ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 42.5', 'EU 43', 'EU 44', 'EU 44.5', 'EU 45', 'EU 46'];
const CONDITIONS = [
    { value: 'new', label: 'New (Sealed)' },
    { value: '3', label: 'Used — Like New' },
    { value: '2', label: 'Used — Very Good' },
    { value: '1', label: 'Used — Good' },
];
const DURATIONS = [{ value: '1d', label: '1 Day' }, { value: '3d', label: '3 Days' }, { value: '7d', label: '7 Days' }];

const sxField = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '10px', background: 'var(--color-surface)', color: 'var(--color-text)',
        '& fieldset': { borderColor: 'var(--color-border)' },
        '&:hover fieldset': { borderColor: 'var(--color-secondary)' },
        '&.Mui-focused fieldset': { borderColor: 'var(--color-accent)' },
    },
    '& .MuiInputLabel-root': { color: 'var(--color-text-muted)', fontSize: '0.85rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-accent)' },
    '& input, & textarea': { color: 'var(--color-text)', fontSize: '0.85rem' },
    '& .MuiSelect-select': { color: 'var(--color-text)', fontSize: '0.85rem' },
};

export const SellerListingsSection = ({ profile }: Props) => {
    const [listings, setListings] = useState<Listing[]>([]);

    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<Listing | null>(null);
    const [newPrice, setNewPrice] = useState('');

    const [addOpen, setAddOpen] = useState(false);
    const [addSuccess, setAddSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

    const [listingSize, setListingSize] = useState('EU 42');
    const [listingPrice, setListingPrice] = useState('');
    const [listingCondition, setListingCondition] = useState('new');
    const [listingDescription, setListingDescription] = useState('');

    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [auctionOpen, setAuctionOpen] = useState(false);
    const [auctionListing, setAuctionListing] = useState<Listing | null>(null);
    const [auctionForm, setAuctionForm] = useState({ startPrice: '', reservePrice: '', duration: '3d' });
    const [auctionSuccess, setAuctionSuccess] = useState(false);

    const [listAsAuction, setListAsAuction] = useState(false);
    const [auctionStartPrice, setAuctionStartPrice] = useState('');
    const [auctionReservePrice, setAuctionReservePrice] = useState('');
    const [auctionDuration, setAuctionDuration] = useState('3d');

    useEffect(() => {
        httpClient.get<{ items: Listing[] }>(ApiRoutes.sellerListings)
            .then((r) => setListings(r.data.items));
    }, []);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (searchQuery.length < 2) { setSearchResults([]); return; }

        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await httpClient.get<{ items: CatalogProduct[] }>(
                    ApiRoutes.sellerCatalogSearch(searchQuery)
                );
                setSearchResults(res.data.items);
            } catch { setSearchResults([]); }
            finally { setSearching(false); }
        }, 300);
    }, [searchQuery]);

    const isUsed = listingCondition !== 'new';

    const handlePhotos = (files: FileList | null) => {
        if (!files) return;
        const newFiles = Array.from(files).slice(0, 6 - photos.length);
        setPhotos(prev => [...prev, ...newFiles]);
        setPhotoPreviews(prev => [
            ...prev,
            ...newFiles.map(f => URL.createObjectURL(f))
        ]);
    };

    const removePhoto = (idx: number) => {
        URL.revokeObjectURL(photoPreviews[idx]);
        setPhotos(prev => prev.filter((_, i) => i !== idx));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
    };

    const resetAddForm = () => {
        setSelectedProduct(null);
        setSearchQuery('');
        setSearchResults([]);
        setListingSize('EU 42');
        setListingPrice('');
        setListingCondition('new');
        setListingDescription('');
        photos.forEach((_, i) => URL.revokeObjectURL(photoPreviews[i]));
        setPhotos([]);
        setPhotoPreviews([]);
        setAddSuccess(false);
        setSubmitting(false);
        setListAsAuction(false);
        setAuctionStartPrice('');
        setAuctionReservePrice('');
        setAuctionDuration('3d');
    };

    const handleAddListing = async () => {
        if (!selectedProduct || (!listAsAuction && !listingPrice)) return;
        if (listAsAuction && !auctionStartPrice) return;
        setSubmitting(true);

        try {
            let listingId: string;

            if (isUsed) {
                const res = await httpClient.post<Listing>(ApiRoutes.sellerCreateUsedListing, {
                    productId: selectedProduct.id,
                    sizeLabel: listingSize,
                    price: listAsAuction ? Number(auctionStartPrice) : Number(listingPrice),
                    condition: Number(listingCondition),
                    description: listingDescription || null,
                });
                listingId = res.data.id;

                if (photos.length > 0) {
                    const formData = new FormData();
                    photos.forEach(f => formData.append('files', f));
                    await httpClient.post(
                        ApiRoutes.sellerUploadPhotos(listingId),
                        formData,
                        { headers: { 'Content-Type': 'multipart/form-data' } }
                    );
                }

                if (!listAsAuction) setListings(prev => [res.data, ...prev]);
            } else {
                const res = await httpClient.post<Listing>(ApiRoutes.sellerListings, {
                    productId: selectedProduct.id,
                    sizeLabel: listingSize,
                    price: listAsAuction ? Number(auctionStartPrice) : Number(listingPrice),
                });
                listingId = res.data.id;

                if (!listAsAuction) setListings(prev => [res.data, ...prev]);
            }

            if (listAsAuction) {
                await httpClient.post(ApiRoutes.createAuction, {
                    stockItemId: listingId,
                    startPrice: Number(auctionStartPrice),
                    reservePrice: auctionReservePrice ? Number(auctionReservePrice) : null,
                    duration: auctionDuration,
                });
            }

            setAddSuccess(true);
            setTimeout(() => { setAddOpen(false); resetAddForm(); }, 1500);
        } catch {
            setSubmitting(false);
        }
    };
    const handleEditPrice = async () => {
        if (!editing) return;
        try {
            await httpClient.patch(`${ApiRoutes.sellerListings}/${editing.id}/price`, {
                price: Number(newPrice),
            });
            setListings(l => l.map(item =>
                item.id === editing.id ? { ...item, price: Number(newPrice) } : item
            ));
            setEditOpen(false);
        } catch { }
    };

    const handleCreateAuction = async () => {
        if (!auctionListing || !auctionForm.startPrice) return;
        try {
            await httpClient.post(ApiRoutes.createAuction, {
                stockItemId: auctionListing.id,
                startPrice: Number(auctionForm.startPrice),
                reservePrice: auctionForm.reservePrice ? Number(auctionForm.reservePrice) : null,
                duration: auctionForm.duration,
            });
            setAuctionSuccess(true);
            setTimeout(() => {
                setAuctionOpen(false);
                setAuctionSuccess(false);
                setAuctionListing(null);
            }, 1500);
        } catch { }
    };

    const stats = [
        { label: 'Active', value: listings.filter(l => l.status === 'active').length },
        { label: 'Sold', value: listings.filter(l => l.status === 'sold').length },
        { label: 'Pending', value: listings.filter(l => l.status === 'pendingreview').length },
        { label: 'Views', value: listings.reduce((s, l) => s + l.views, 0) },
    ];

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <h2 className={styles.title}>My Listings</h2>
                <Button startIcon={<Add />} variant="contained" size="small"
                    onClick={() => { resetAddForm(); setAddOpen(true); }}
                    sx={{ background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', fontSize: '0.78rem', borderRadius: '100px' }}>
                    Add Listing
                </Button>
            </div>

            <div className={styles.statsRow}>
                {stats.map(s => (
                    <GlassCard key={s.label} className={styles.statCard}>
                        <span className={styles.statValue}>{s.value}</span>
                        <span className={styles.statLabel}>{s.label}</span>
                    </GlassCard>
                ))}
            </div>

            <GlassCard noPadding>
                <div className={styles.tableHeader}>
                    <span>Product</span><span>Size</span><span>Price</span>
                    <span>Status</span><span>Views</span><span>Actions</span>
                </div>
                {listings.map(l => {
                    const cfg = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.inactive;
                    return (
                        <div key={l.id} className={styles.tableRow}>
                            <div className={styles.productCell}>
                                <img src={l.image} alt={l.name} className={styles.listingImg} />
                                <div>
                                    <span className={styles.listingName}>{l.name}</span>
                                    <span className={styles.listingBrand}>{l.brand}</span>
                                </div>
                            </div>
                            <span className={styles.cell}>{l.size}</span>
                            <span className={styles.cellPrice}>${l.price}</span>
                            <Chip label={cfg.label} size="small" sx={{
                                height: 20, fontSize: '0.62rem', fontWeight: 700,
                                fontFamily: 'var(--font-display)',
                                background: `${cfg.color}18`, color: cfg.color,
                                border: `1px solid ${cfg.color}40`,
                            }} />
                            <div className={styles.viewsCell}>
                                <Visibility sx={{ fontSize: 14, color: 'var(--color-text-muted)' }} />
                                <span>{l.views}</span>
                            </div>
                            <div className={styles.actionsCell}>
                                {l.inAuction ? (
                                    <Chip label="In Auction" size="small" icon={<Gavel sx={{ fontSize: 13 }} />} sx={{
                                        height: 22, fontSize: '0.62rem', fontWeight: 700,
                                        fontFamily: 'var(--font-display)',
                                        background: 'rgba(163,197,27,0.12)', color: 'var(--color-accent)',
                                        border: '1px solid rgba(163,197,27,0.3)',
                                        '& .MuiChip-icon': { color: 'var(--color-accent)' },
                                    }} />
                                ) : l.status === 'active' && (
                                    <>
                                        <button className={styles.editBtn} onClick={() => {
                                            setEditing(l); setNewPrice(String(l.price)); setEditOpen(true);
                                        }}>
                                            <Edit sx={{ fontSize: 14 }} /> Edit Price
                                        </button>
                                        <button className={styles.auctionBtn} onClick={() => {
                                            setAuctionListing(l); setAuctionForm({ startPrice: '', reservePrice: '', duration: '3d' }); setAuctionOpen(true);
                                        }}>
                                            <Gavel sx={{ fontSize: 14 }} /> Auction
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </GlassCard>

            {/* ── Add Listing Dialog ── */}
            <Dialog open={addOpen} onClose={() => { setAddOpen(false); resetAddForm(); }}
                maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '16px' } } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontWeight: 700 }}>
                    Add New Listing
                </DialogTitle>
                <DialogContent>
                    {addSuccess ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#22c55e', fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
                            {listAsAuction ? '✓ Auction created successfully!' : '✓ Listing submitted for verification!'}
                        </div>
                    ) : !selectedProduct ? (
                        /* Step 1: Search catalog */
                        <div style={{ paddingTop: 8 }}>
                            <TextField
                                label="Search product catalog" value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                size="small" fullWidth autoFocus
                                sx={sxField}
                                helperText="Search by product name or brand"
                                slotProps={{
                                    input: { startAdornment: <Search sx={{ fontSize: 18, color: 'var(--color-text-muted)', mr: 1 }} /> },
                                    formHelperText: { sx: { color: 'var(--color-text-muted)', fontSize: '0.7rem' } }
                                }}
                            />
                            <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 8 }}>
                                {searching && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', padding: 8 }}>Searching...</p>}
                                {searchResults.map(p => (
                                    <div key={p.id} onClick={() => { setSelectedProduct(p); setListingPrice(String(p.retailPrice)); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px',
                                            borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
                                            borderRadius: 8, transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(163,197,27,0.06)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <img src={p.image} alt={p.name}
                                            referrerPolicy="no-referrer"
                                            style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', background: 'var(--color-surface)', padding: 4 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)' }}>{p.name}</div>
                                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{p.brand} · Retail ${p.retailPrice}</div>
                                        </div>
                                    </div>
                                ))}
                                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', padding: 16, textAlign: 'center' }}>
                                        No products found for "{searchQuery}"
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Details */
                        <div style={{ paddingTop: 8 }}>
                            {/* Selected product preview */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                                background: 'var(--color-surface)', borderRadius: 10, marginBottom: 16,
                                border: '1px solid var(--color-border)'
                            }}>
                                <img src={selectedProduct.image} alt={selectedProduct.name}
                                    referrerPolicy="no-referrer"
                                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', padding: 4 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)' }}>{selectedProduct.name}</div>
                                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{selectedProduct.brand}</div>
                                </div>
                                <button onClick={() => setSelectedProduct(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                                    <Close sx={{ fontSize: 18 }} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <TextField select label="Size" value={listingSize}
                                    onChange={e => setListingSize(e.target.value)}
                                    size="small" fullWidth sx={sxField}>
                                    {SIZES.map(s => <MenuItem key={s} value={s} sx={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>{s}</MenuItem>)}
                                </TextField>
                                <TextField select label="Condition" value={listingCondition}
                                    onChange={e => setListingCondition(e.target.value)}
                                    size="small" fullWidth sx={sxField}>
                                    {CONDITIONS.map(c => <MenuItem key={c.value} value={c.value} sx={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>{c.label}</MenuItem>)}
                                </TextField>

                                {/* Auction toggle */}
                                <div style={{
                                    gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 14px', borderRadius: 10,
                                    background: listAsAuction ? 'rgba(163,197,27,0.08)' : 'var(--color-surface)',
                                    border: `1px solid ${listAsAuction ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }} onClick={() => setListAsAuction(v => !v)}>
                                    <Gavel sx={{ fontSize: 18, color: listAsAuction ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                            List as Auction
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                            Create an auction instead of a fixed-price listing
                                        </div>
                                    </div>
                                    <div style={{
                                        width: 36, height: 20, borderRadius: 10, position: 'relative',
                                        background: listAsAuction ? 'var(--color-accent)' : 'var(--color-border)',
                                        transition: 'background 0.2s',
                                    }}>
                                        <div style={{
                                            width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                            position: 'absolute', top: 2,
                                            left: listAsAuction ? 18 : 2,
                                            transition: 'left 0.2s',
                                        }} />
                                    </div>
                                </div>

                                {/* Fixed price — only when NOT auction */}
                                {!listAsAuction && (
                                    <TextField label="Your Price ($)" type="number" value={listingPrice}
                                        onChange={e => setListingPrice(e.target.value)}
                                        size="small" fullWidth sx={{ gridColumn: '1/-1', ...sxField }} />
                                )}

                                {/* Auction fields */}
                                {listAsAuction && (
                                    <>
                                        <TextField label="Start Price ($)" type="number" value={auctionStartPrice}
                                            onChange={e => setAuctionStartPrice(e.target.value)}
                                            size="small" fullWidth sx={sxField} />
                                        <TextField select label="Duration" value={auctionDuration}
                                            onChange={e => setAuctionDuration(e.target.value)}
                                            size="small" fullWidth sx={sxField}>
                                            {DURATIONS.map(d => <MenuItem key={d.value} value={d.value} sx={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>{d.label}</MenuItem>)}
                                        </TextField>
                                        <TextField label="Reserve Price ($) — optional" type="number" value={auctionReservePrice}
                                            onChange={e => setAuctionReservePrice(e.target.value)}
                                            size="small" fullWidth sx={{ gridColumn: '1/-1', ...sxField }} />
                                    </>
                                )}

                                {/* Used item extras (photos, description) */}
                                {isUsed && (
                                    <>
                                        <TextField label="Description (optional)" value={listingDescription}
                                            onChange={e => setListingDescription(e.target.value)}
                                            multiline rows={2} size="small" fullWidth sx={{ gridColumn: '1/-1', ...sxField }} />

                                        <div style={{ gridColumn: '1/-1' }}>
                                            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
                                                onChange={e => handlePhotos(e.target.files)} />
                                            <Button startIcon={<CloudUpload />} variant="outlined" size="small"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={photos.length >= 6}
                                                sx={{
                                                    borderColor: 'var(--color-border)', color: 'var(--color-text-muted)',
                                                    fontFamily: 'var(--font-display)', fontSize: '0.75rem', borderRadius: '100px',
                                                    '&:hover': { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }
                                                }}>
                                                Upload Photos ({photos.length}/6)
                                            </Button>

                                            {photoPreviews.length > 0 && (
                                                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                                    {photoPreviews.map((url, i) => (
                                                        <div key={i} style={{ position: 'relative', width: 64, height: 64 }}>
                                                            <img src={url} alt="" style={{
                                                                width: '100%', height: '100%', objectFit: 'cover',
                                                                borderRadius: 8, border: '1px solid var(--color-border)'
                                                            }} />
                                                            <button onClick={() => removePhoto(i)}
                                                                style={{
                                                                    position: 'absolute', top: -6, right: -6,
                                                                    width: 18, height: 18, borderRadius: '50%',
                                                                    background: '#ef4444', color: '#fff', border: 'none',
                                                                    fontSize: '0.6rem', cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}>✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
                {!addSuccess && selectedProduct && (
                    <DialogActions sx={{ padding: '12px 24px' }}>
                        <Button onClick={() => setSelectedProduct(null)} sx={{ color: 'var(--color-text-muted)' }}>Back</Button>
                        <Button onClick={handleAddListing} variant="contained"
                            disabled={
                                submitting ||
                                (listAsAuction ? !auctionStartPrice : !listingPrice) ||
                                (isUsed && photos.length === 0)
                            }
                            sx={{ background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', borderRadius: '100px', '&.Mui-disabled': { opacity: 0.4 } }}>
                            {submitting ? 'Submitting...' : listAsAuction ? '🔨 Create Auction' : 'Submit Listing'}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>

            {/* ── Edit Price Dialog ── */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '16px' } } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontWeight: 700 }}>
                    Edit Price — {editing?.name}
                </DialogTitle>
                <DialogContent>
                    <TextField label="New Price ($)" type="number" value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        size="small" fullWidth sx={{ mt: 1, ...sxField }} />
                </DialogContent>
                <DialogActions sx={{ padding: '12px 24px' }}>
                    <Button onClick={() => setEditOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancel</Button>
                    <Button onClick={handleEditPrice} variant="contained"
                        sx={{ background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', borderRadius: '100px' }}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* ── Create Auction Dialog ── */}
            <Dialog open={auctionOpen} onClose={() => { setAuctionOpen(false); setAuctionSuccess(false); }}
                maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '16px' } } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontWeight: 700 }}>Create Auction</DialogTitle>
                <DialogContent>
                    {auctionSuccess ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#22c55e', fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
                            ✓ Auction created successfully!
                        </div>
                    ) : (
                        <>
                            {auctionListing && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0 20px', borderBottom: '1px solid var(--color-border)', marginBottom: 16 }}>
                                    <img src={auctionListing.image} alt={auctionListing.name}
                                        style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'contain', background: 'var(--color-surface)', padding: 4 }} />
                                    <div>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)' }}>{auctionListing.name}</div>
                                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{auctionListing.brand} · Size {auctionListing.size} · ${auctionListing.price}</div>
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <TextField label="Start Price ($)" type="number" value={auctionForm.startPrice}
                                    onChange={e => setAuctionForm(f => ({ ...f, startPrice: e.target.value }))}
                                    size="small" fullWidth sx={sxField} />
                                <TextField select label="Duration" value={auctionForm.duration}
                                    onChange={e => setAuctionForm(f => ({ ...f, duration: e.target.value }))}
                                    size="small" fullWidth sx={sxField}>
                                    {DURATIONS.map(d => <MenuItem key={d.value} value={d.value} sx={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>{d.label}</MenuItem>)}
                                </TextField>
                                <TextField label="Reserve Price ($) — optional" type="number" value={auctionForm.reservePrice}
                                    onChange={e => setAuctionForm(f => ({ ...f, reservePrice: e.target.value }))}
                                    size="small" fullWidth sx={{ gridColumn: '1/-1', ...sxField }} />
                            </div>
                        </>
                    )}
                </DialogContent>
                {!auctionSuccess && (
                    <DialogActions sx={{ padding: '12px 24px' }}>
                        <Button onClick={() => setAuctionOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancel</Button>
                        <Button onClick={handleCreateAuction} variant="contained" disabled={!auctionForm.startPrice}
                            sx={{ background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', borderRadius: '100px', '&.Mui-disabled': { opacity: 0.4 } }}>
                            <Gavel sx={{ fontSize: 16, mr: 0.5 }} /> Start Auction
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </div>
    );
};