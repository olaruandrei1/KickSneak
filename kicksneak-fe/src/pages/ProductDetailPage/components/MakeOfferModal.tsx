import { useState } from 'react';
import { Button, TextField, Typography, Checkbox, FormControlLabel } from '@mui/material';
import { AppModal } from '../../../components/molecules/AppModal/AppModal';
import styles from './MakeOfferModal.module.css';

interface MakeOfferModalProps {
    open: boolean;
    onClose: () => void;
    productName: string;
    lowestAsk: number;
    selectedSize: string;
}

const TERMS_MOCK = `By placing an offer on KickSneak, you agree to purchase the item at your offered price if a seller accepts within 48 hours. Your payment method will be charged only upon acceptance. Offers are binding and cannot be cancelled after submission. All items are subject to our standard authentication process before shipment.`;

export const MakeOfferModal = ({
    open,
    onClose,
    productName,
    lowestAsk,
    selectedSize,
}: MakeOfferModalProps) => {
    const [amount, setAmount] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
        if (!amount || !agreed) return;
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setAmount('');
            setAgreed(false);
            onClose();
        }, 2000);
    };

    return (
        <AppModal open={open} onClose={onClose} title="Make an Offer" maxWidth="xs">
            <div className={styles.wrapper}>
                {submitted ? (
                    <div className={styles.success}>
                        <span className={styles.successIcon}>✓</span>
                        <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                            Offer Submitted!
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                            We'll notify you when a seller responds.
                        </Typography>
                    </div>
                ) : (
                    <>
                        <div className={styles.productInfo}>
                            <span className={styles.productName}>{productName}</span>
                            <span className={styles.size}>Size: <strong>{selectedSize}</strong></span>
                            <span className={styles.lowestAsk}>Lowest Ask: <strong>${lowestAsk}</strong></span>
                        </div>

                        <TextField
                            label="Your Offer ($)"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            fullWidth
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text)',
                                    '& fieldset': { borderColor: 'var(--color-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--color-secondary)' },
                                    '&.Mui-focused fieldset': { borderColor: 'var(--color-accent)' },
                                },
                                '& .MuiInputLabel-root': { color: 'var(--color-text-muted)' },
                                '& .MuiInputLabel-root.Mui-focused': { color: 'var(--color-accent)' },
                                '& input': { color: 'var(--color-text)' },
                            }}
                        />

                        <div className={styles.terms}>
                            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                                {TERMS_MOCK}
                            </Typography>
                        </div>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    size="small"
                                    sx={{
                                        color: 'var(--color-border)',
                                        '&.Mui-checked': { color: 'var(--color-secondary)' },
                                    }}
                                />
                            }
                            label={
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text)' }}>
                                    I agree to the terms and conditions
                                </span>
                            }
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            disabled={!amount || !agreed}
                            onClick={handleSubmit}
                            sx={{
                                borderRadius: '100px',
                                background: 'var(--color-secondary)',
                                color: 'var(--color-bg)',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                py: 1.2,
                                '&:hover': { background: 'var(--color-primary)' },
                                '&.Mui-disabled': { opacity: 0.4 },
                            }}
                        >
                            Submit Offer
                        </Button>
                    </>
                )}
            </div>
        </AppModal>
    );
};