import { useState } from 'react';
import { Button, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { DeleteForever, Warning } from '@mui/icons-material';
import { firebaseService } from '../../../../services/firebaseService';
import { useAuthStore } from '../../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '../../../../types/profile';
import { GlassCard } from './GlassCard';
import styles from './SettingsSection.module.css';

interface Props {
    profile: UserProfile;
    onProfileUpdate: (p: UserProfile) => void;
}

export const SettingsSection = ({ profile }: Props) => {
    const navigate = useNavigate();
    const { setUser } = useAuthStore();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [confirm, setConfirm] = useState('');
    const [notifications, setNotifications] = useState({
        priceDrops: true,
        newReleases: true,
        orderUpdates: true,
        marketing: false,
    });

    const handleDeleteAccount = async () => {
    if (confirm !== 'DELETE') return;
    try {
        await firebaseService.deleteAccount();
    } catch {
        await firebaseService.logout();
    }
    setUser(null);
    navigate('/');
};

    const sxSwitch = {
        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-secondary)' },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--color-secondary)' },
    };

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>Settings</h2>

            {/* Notification preferences */}
            <GlassCard>
                <h3 className={styles.sectionTitle}>Notification Preferences</h3>
                <div className={styles.switchList}>
                    {[
                        { key: 'priceDrops', label: 'Price Drop Alerts' },
                        { key: 'newReleases', label: 'New Releases' },
                        { key: 'orderUpdates', label: 'Order Updates' },
                        { key: 'marketing', label: 'Marketing & Promotions' },
                    ].map(({ key, label }) => (
                        <FormControlLabel
                            key={key}
                            control={
                                <Switch
                                    checked={(notifications as any)[key]}
                                    onChange={(e) => setNotifications((n) => ({ ...n, [key]: e.target.checked }))}
                                    size="small"
                                    sx={sxSwitch}
                                />
                            }
                            label={<span className={styles.switchLabel}>{label}</span>}
                            labelPlacement="start"
                            sx={{ justifyContent: 'space-between', ml: 0, width: '100%' }}
                        />
                    ))}
                </div>
            </GlassCard>

            {/* Account info */}
            <GlassCard>
                <h3 className={styles.sectionTitle}>Account Info</h3>
                <div className={styles.infoGrid}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Email</span>
                        <span className={styles.infoValue}>{profile.email}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Member since</span>
                        <span className={styles.infoValue}>
                            {new Date(profile.joinedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Account type</span>
                        <span className={styles.infoValue}>{profile.isSeller ? 'Buyer + Seller' : 'Buyer'}</span>
                    </div>
                </div>
            </GlassCard>

            {/* Danger zone */}
            <GlassCard className={styles.dangerCard}>
                <div className={styles.dangerHeader}>
                    <Warning sx={{ fontSize: 20, color: '#ef4444' }} />
                    <h3 className={styles.dangerTitle}>Danger Zone</h3>
                </div>
                <p className={styles.dangerDesc}>
                    Deleting your account is permanent and cannot be undone. All your data, orders, and listings will be removed.
                </p>
                <Button
                    variant="outlined"
                    startIcon={<DeleteForever />}
                    onClick={() => setDeleteOpen(true)}
                    sx={{
                        borderColor: '#ef4444',
                        color: '#ef4444',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.78rem',
                        borderRadius: '100px',
                        '&:hover': { background: 'rgba(239,68,68,0.08)', borderColor: '#ef4444' },
                    }}
                >
                    Delete Account
                </Button>
            </GlassCard>

            {/* Confirm delete dialog */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { background: 'var(--color-bg)', border: '1px solid #ef444440', borderRadius: '16px' } } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-display)', color: '#ef4444', fontWeight: 700 }}>
                    Delete Account
                </DialogTitle>
                <DialogContent>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                        Type <strong style={{ color: 'var(--color-text)' }}>DELETE</strong> to confirm.
                    </p>
                    <TextField
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        size="small" fullWidth placeholder="DELETE"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '10px', background: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                '& fieldset': { borderColor: '#ef444440' },
                                '&.Mui-focused fieldset': { borderColor: '#ef4444' },
                            },
                            '& input': { color: 'var(--color-text)' },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ padding: '12px 24px' }}>
                    <Button onClick={() => setDeleteOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancel</Button>
                    <Button
                        onClick={handleDeleteAccount}
                        disabled={confirm !== 'DELETE'}
                        variant="contained"
                        sx={{
                            background: '#ef4444', fontFamily: 'var(--font-display)',
                            borderRadius: '100px',
                            '&:hover': { background: '#dc2626' },
                            '&.Mui-disabled': { opacity: 0.4 },
                        }}
                    >
                        Delete Forever
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};