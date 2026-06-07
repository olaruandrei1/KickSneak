import { useState, useEffect } from 'react';
import { TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress } from '@mui/material';
import { Add, Edit, Delete, Home, Business, Check } from '@mui/icons-material';
import { GlassCard } from './GlassCard';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import styles from './AddressesSection.module.css';

interface AddressDto {
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
    building?: string;
    stairwell?: string;
    floor?: string;
    apartment?: string;
    accessCode?: string;
    postalCode?: string;
    deliveryInstructions?: string;
    phone?: string;
}

const EMPTY: AddressDto = {
    addressName: 'Home',
    isPrincipal: false,
    firstName: '', lastName: '',
    country: 'Romania', city: '', county: '',
    street: '', streetNumber: '',
    postalCode: '', phone: '',
};

export const AddressesSection = () => {
    const [addresses, setAddresses] = useState<AddressDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AddressDto | null>(null);
    const [form, setForm] = useState<AddressDto>(EMPTY);

    useEffect(() => {
        httpClient.get<AddressDto[]>(ApiRoutes.profileAddresses())
            .then((r) => setAddresses(r.data))
            .finally(() => setLoading(false));
    }, []);

    const openAdd = () => {
        setEditing(null);
        setForm(EMPTY);
        setModalOpen(true);
    };

    const openEdit = (addr: AddressDto) => {
        setEditing(addr);
        setForm({ ...addr });
        setModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await httpClient.post<AddressDto>(ApiRoutes.profileAddresses(), form);
            if (editing) {
                setAddresses((prev) => prev.map((a) => a.id === editing.id ? res.data : a));
            } else {
                setAddresses((prev) => [...prev, res.data]);
            }
            setModalOpen(false);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        await httpClient.delete(ApiRoutes.profileAddress(id));
        setAddresses((prev) => prev.filter((a) => a.id !== id));
    };

    const handleSetDefault = async (id: string) => {
        await httpClient.patch(ApiRoutes.profileAddressDefault(id));
        setAddresses((prev) => prev.map((a) => ({ ...a, isPrincipal: a.id === id })));
    };

    const field = (key: keyof AddressDto, label: string) => (
        <TextField
            label={label}
            value={(form as any)[key] ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            size="small"
            fullWidth
            sx={sxField}
        />
    );

    if (loading) return <CircularProgress size={24} sx={{ color: 'var(--color-accent)', m: 2 }} />;

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <h2 className={styles.title}>Addresses & Contact</h2>
                <Button startIcon={<Add />} variant="outlined" size="small" onClick={openAdd} sx={sxBtn}>
                    Add Address
                </Button>
            </div>

            <div className={styles.addrList}>
                {addresses.map((addr) => (
                    <GlassCard key={addr.id} className={styles.addrCard}>
                        <div className={styles.addrHeader}>
                            <div className={styles.addrLabelWrap}>
                                {addr.addressName === 'Home'
                                    ? <Home sx={{ fontSize: 16, color: 'var(--color-accent)' }} />
                                    : <Business sx={{ fontSize: 16, color: 'var(--color-accent)' }} />
                                }
                                <span className={styles.addrLabel}>{addr.addressName}</span>
                                {addr.isPrincipal && (
                                    <Chip label="Default" size="small" sx={{
                                        height: 18, fontSize: '0.6rem',
                                        background: 'rgba(64,138,113,0.15)',
                                        color: 'var(--color-accent)',
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 700,
                                    }} />
                                )}
                            </div>
                            <div className={styles.addrActions}>
                                {!addr.isPrincipal && (
                                    <button className={styles.actionBtn} onClick={() => handleSetDefault(addr.id!)} title="Set as default">
                                        <Check sx={{ fontSize: 16 }} />
                                    </button>
                                )}
                                <button className={styles.actionBtn} onClick={() => openEdit(addr)}>
                                    <Edit sx={{ fontSize: 16 }} />
                                </button>
                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(addr.id!)}>
                                    <Delete sx={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <p className={styles.addrText}>
                            {addr.firstName} {addr.lastName}<br />
                            {addr.street} {addr.streetNumber}<br />
                            {addr.city}, {addr.county} {addr.postalCode}<br />
                            {addr.country}<br />
                            <span className={styles.addrPhone}>{addr.phone}</span>
                        </p>
                    </GlassCard>
                ))}
            </div>

            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '16px' } } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontWeight: 700 }}>
                    {editing ? 'Edit Address' : 'Add Address'}
                </DialogTitle>
                <DialogContent>
                    <div className={styles.formGrid}>
                        {field('addressName', 'Label (Home / Office)')}
                        {field('firstName', 'First Name')}
                        {field('lastName', 'Last Name')}
                        {field('street', 'Street')}
                        {field('streetNumber', 'Street Number')}
                        {field('building', 'Building (optional)')}
                        {field('floor', 'Floor (optional)')}
                        {field('apartment', 'Apartment (optional)')}
                        {field('city', 'City')}
                        {field('county', 'County / Sector')}
                        {field('postalCode', 'Postal Code')}
                        {field('country', 'Country')}
                        {field('phone', 'Phone')}
                        {field('deliveryInstructions', 'Delivery Instructions (optional)')}
                    </div>
                </DialogContent>
                <DialogActions sx={{ padding: '12px 24px' }}>
                    <Button onClick={() => setModalOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving}
                        sx={{ background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', borderRadius: '100px' }}>
                        {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

const sxField = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '10px',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        '& fieldset': { borderColor: 'var(--color-border)' },
        '&:hover fieldset': { borderColor: 'var(--color-secondary)' },
        '&.Mui-focused fieldset': { borderColor: 'var(--color-accent)' },
    },
    '& .MuiInputLabel-root': { color: 'var(--color-text-muted)', fontSize: '0.85rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-accent)' },
    '& input': { color: 'var(--color-text)', fontSize: '0.85rem' },
};

const sxBtn = {
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-display)',
    fontSize: '0.78rem',
    borderRadius: '100px',
    '&:hover': { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' },
};