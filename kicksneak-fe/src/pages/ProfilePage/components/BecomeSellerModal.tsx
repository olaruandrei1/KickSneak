import { useState } from 'react';
import { TextField, Button, MenuItem, Stepper, Step, StepLabel, Checkbox, FormControlLabel } from '@mui/material';
import { Store, Person, CheckCircle } from '@mui/icons-material';
import { AppModal } from '../../../components/molecules/AppModal/AppModal';
import type { UserProfile } from '../../../types/profile';
import styles from './BecomeSellerModal.module.css';
import { httpClient } from '../../../services/axiosService';
import { ApiRoutes } from '../../../services/apiRoutes';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (profile: UserProfile) => void;
}

const STEPS = ['Personal Info', 'Store Details', 'Confirm'];

const SELL_TYPES = ['Occasional (1-5 items/month)', 'Regular (5-20 items/month)', 'Professional (20+ items/month)'];
const PRODUCT_TYPES = ['Sneakers', 'Apparel', 'Accessories', 'Collectibles', 'Mixed'];

export const BecomeSellerModal = ({ open, onClose, onSuccess }: Props) => {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        firstName: '', lastName: '', phone: '', city: '',
        storeName: '', sellType: '', productType: '',
        hasCompany: false, companyName: '', vatNumber: '',
        agreeTerms: false,
    });

    const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value }));

    const handleNext = () => setStep((s) => s + 1);
    const handleBack = () => setStep((s) => s - 1);

    const handleSubmit = async () => {
        try {
            const res = await httpClient.post(ApiRoutes.becomeSeller, {
                firstName: form.firstName,
                lastName: form.lastName,
                phone: form.phone,
                city: form.city,
                storeName: form.storeName,
                sellType: form.sellType,
                productType: form.productType,
                hasCompany: form.hasCompany,
                companyName: form.companyName || null,
                vatNumber: form.vatNumber || null,
            });

            localStorage.setItem('kicksneak-is-seller', 'true');
            onSuccess(res.data);
        } catch { }
    };

    const canNext = [
        form.firstName && form.lastName && form.phone && form.city,
        form.storeName && form.sellType && form.productType,
        form.agreeTerms,
    ][step];

    return (
        <AppModal open={open} onClose={onClose} title="Become a Seller" maxWidth="sm">
            <div className={styles.wrapper}>
                <Stepper activeStep={step} sx={{ mb: 3 }}>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel sx={{
                                '& .MuiStepLabel-label': { fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--color-text-muted)' },
                                '& .MuiStepLabel-label.Mui-active': { color: 'var(--color-text)' },
                                '& .MuiStepIcon-root.Mui-active': { color: 'var(--color-secondary)' },
                                '& .MuiStepIcon-root.Mui-completed': { color: 'var(--color-secondary)' },
                            }}>
                                {label}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* Step 0 — Personal */}
                {step === 0 && (
                    <div className={styles.stepContent}>
                        <div className={styles.iconHeader}>
                            <Person sx={{ fontSize: 32, color: 'var(--color-accent)' }} />
                            <p className={styles.stepDesc}>Tell us about yourself so we can verify your account.</p>
                        </div>
                        <div className={styles.formGrid}>
                            <TextField label="First Name" value={form.firstName} onChange={f('firstName')} size="small" sx={sxField} />
                            <TextField label="Last Name" value={form.lastName} onChange={f('lastName')} size="small" sx={sxField} />
                            <TextField label="Phone" value={form.phone} onChange={f('phone')} size="small" sx={sxField} />
                            <TextField label="City" value={form.city} onChange={f('city')} size="small" sx={sxField} />
                        </div>
                    </div>
                )}

                {/* Step 1 — Store */}
                {step === 1 && (
                    <div className={styles.stepContent}>
                        <div className={styles.iconHeader}>
                            <Store sx={{ fontSize: 32, color: 'var(--color-accent)' }} />
                            <p className={styles.stepDesc}>Set up your seller profile and store details.</p>
                        </div>
                        <div className={styles.formGrid}>
                            <TextField label="Store Name" value={form.storeName} onChange={f('storeName')} size="small" sx={{ ...sxField, gridColumn: '1/-1' }} />
                            <TextField select label="Selling Frequency" value={form.sellType}
                                onChange={(e) => setForm((p) => ({ ...p, sellType: e.target.value }))}
                                size="small" sx={sxField}>
                                {SELL_TYPES.map((t) => <MenuItem key={t} value={t} sx={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>{t}</MenuItem>)}
                            </TextField>
                            <TextField select label="Product Types" value={form.productType}
                                onChange={(e) => setForm((p) => ({ ...p, productType: e.target.value }))}
                                size="small" sx={sxField}>
                                {PRODUCT_TYPES.map((t) => <MenuItem key={t} value={t} sx={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>{t}</MenuItem>)}
                            </TextField>
                            <FormControlLabel
                                control={<Checkbox checked={form.hasCompany} onChange={(e) => setForm((p) => ({ ...p, hasCompany: e.target.checked }))}
                                    size="small" sx={{ color: 'var(--color-border)', '&.Mui-checked': { color: 'var(--color-secondary)' } }} />}
                                label={<span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text)' }}>I represent a company</span>}
                                sx={{ gridColumn: '1/-1' }}
                            />
                            {form.hasCompany && <>
                                <TextField label="Company Name" value={form.companyName} onChange={f('companyName')} size="small" sx={sxField} />
                                <TextField label="VAT Number" value={form.vatNumber} onChange={f('vatNumber')} size="small" sx={sxField} />
                            </>}
                        </div>
                    </div>
                )}

                {/* Step 2 — Confirm */}
                {step === 2 && (
                    <div className={styles.stepContent}>
                        <div className={styles.iconHeader}>
                            <CheckCircle sx={{ fontSize: 32, color: 'var(--color-accent)' }} />
                            <p className={styles.stepDesc}>Review your details and confirm.</p>
                        </div>
                        <div className={styles.summary}>
                            {[
                                ['Name', `${form.firstName} ${form.lastName}`],
                                ['Store', form.storeName],
                                ['Frequency', form.sellType],
                                ['Products', form.productType],
                                form.hasCompany ? ['Company', form.companyName] : null,
                            ].filter((item): item is string[] => item !== null)
                                .map(([label, value]) => (
                                    <div key={label} className={styles.summaryRow}>
                                        <span className={styles.summaryLabel}>{label}</span>
                                        <span className={styles.summaryValue}>{value}</span>
                                    </div>
                                ))}
                        </div>
                        <FormControlLabel
                            control={<Checkbox checked={form.agreeTerms} onChange={(e) => setForm((p) => ({ ...p, agreeTerms: e.target.checked }))}
                                size="small" sx={{ color: 'var(--color-border)', '&.Mui-checked': { color: 'var(--color-secondary)' } }} />}
                            label={<span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text)' }}>
                                I agree to the <strong>Seller Terms & Conditions</strong>
                            </span>}
                        />
                    </div>
                )}

                {/* Navigation */}
                <div className={styles.navBtns}>
                    {step > 0 && (
                        <Button onClick={handleBack} sx={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)' }}>
                            Back
                        </Button>
                    )}
                    <div style={{ flex: 1 }} />
                    {step < 2
                        ? <Button variant="contained" onClick={handleNext} disabled={!canNext}
                            sx={{
                                background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', borderRadius: '100px',
                                '&.Mui-disabled': { opacity: 0.4 }
                            }}>
                            Next
                        </Button>
                        : <Button variant="contained" onClick={handleSubmit} disabled={!canNext}
                            sx={{
                                background: 'var(--color-secondary)', fontFamily: 'var(--font-display)', borderRadius: '100px',
                                '&.Mui-disabled': { opacity: 0.4 }
                            }}>
                            Start Selling
                        </Button>
                    }
                </div>
            </div>
        </AppModal>
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
    '& .MuiSelect-select': { color: 'var(--color-text)', fontSize: '0.85rem' },
};