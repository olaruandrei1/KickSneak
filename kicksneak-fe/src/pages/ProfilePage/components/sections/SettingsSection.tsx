import { useState, useEffect } from 'react';
import { Button, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { DeleteForever, Warning } from '@mui/icons-material';
import { firebaseService } from '../../../../services/firebaseService';
import { httpClient } from '../../../../services/axiosService';
import { ApiRoutes } from '../../../../services/apiRoutes';
import { useAuthStore } from '../../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '../../../../types/profile';
import { GlassCard } from './GlassCard';
import styles from './SettingsSection.module.css';

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

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
        priceDrop: false,
        newReleases: false,
        orderUpdates: false,
        marketing: false,
    });
    const [browserPush, setBrowserPush] = useState(
        typeof Notification !== 'undefined' && Notification.permission === 'granted'
    );
    const [pushModalOpen, setPushModalOpen] = useState(false);
    const [pendingCategory, setPendingCategory] = useState<string | null>(null);

    useEffect(() => {
        httpClient.get(ApiRoutes.notificationSettings)
            .then(res => {
                if (res.data) {
                    setNotifications({
                        priceDrop: res.data.priceDrop || false,
                        newReleases: res.data.newReleases || false,
                        orderUpdates: res.data.orderUpdates || false,
                        marketing: res.data.marketing || false,
                    });
                }
            })
            .catch(() => {});
    }, []);

    const saveCategory = async (key: string, checked: boolean) => {
        const updated = { ...notifications, [key]: checked };
        setNotifications(updated);
        try {
            await httpClient.put(ApiRoutes.notificationSettings, updated);
        } catch {
            setNotifications(notifications); // revert on fail
        }
    };

    const subscribeToPush = async () => {
        try {
            const reg = await navigator.serviceWorker.register('/sw.js');
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
                setBrowserPush(false);
                return false;
            }
            
            setBrowserPush(true);

            const { publicKey } = await httpClient.get(ApiRoutes.vapidPublicKey).then(r => r.data);
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
            const json = sub.toJSON();
            await httpClient.post(ApiRoutes.subscribePush, {
                endpoint: json.endpoint, 
                p256dh: json.keys?.p256dh, 
                auth: json.keys?.auth,
            });
            return true;
        } catch (err) {
            console.error(err);
            setBrowserPush(false);
            return false;
        }
    };

    const handleToggleNotification = async (key: string, checked: boolean) => {
        if (checked) {
            const allOff = !notifications.priceDrop && !notifications.newReleases && !notifications.orderUpdates && !notifications.marketing;
            if (allOff && !browserPush) {
                setPendingCategory(key);
                setPushModalOpen(true);
                return;
            }
        }
        await saveCategory(key, checked);
    };

    const handlePushConfirm = async () => {
        setPushModalOpen(false);
        await subscribeToPush();
        if (pendingCategory) {
            await saveCategory(pendingCategory, true);
            setPendingCategory(null);
        }
    };

    const handlePushRefuse = async () => {
        setPushModalOpen(false);
        if (pendingCategory) {
            await saveCategory(pendingCategory, true);
            setPendingCategory(null);
        }
    };

    const handleTogglePush = async (checked: boolean) => {
        if (!checked) {
            try {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                if (sub) await sub.unsubscribe();
            } catch (e) {}
            setBrowserPush(false);
            return;
        }
        await subscribeToPush();
    };

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
                        { key: 'priceDrop', label: 'Price Drop Alerts' },
                        { key: 'newReleases', label: 'New Releases' },
                        { key: 'orderUpdates', label: 'Order Updates' },
                        { key: 'marketing', label: 'Marketing & Promotions' },
                    ].map(({ key, label }) => (
                        <FormControlLabel
                            key={key}
                            control={
                                <Switch
                                    checked={(notifications as any)[key]}
                                    onChange={(e) => handleToggleNotification(key, e.target.checked)}
                                    size="small"
                                    sx={sxSwitch}
                                />
                            }
                            label={<span className={styles.switchLabel}>{label}</span>}
                            labelPlacement="start"
                            sx={{ justifyContent: 'space-between', ml: 0, width: '100%' }}
                        />
                    ))}
                    
                    <FormControlLabel
                        control={
                            <Switch
                                checked={browserPush}
                                onChange={(e) => handleTogglePush(e.target.checked)}
                                size="small"
                                sx={sxSwitch}
                            />
                        }
                        label={<span className={styles.switchLabel}>Enable Browser Notifications</span>}
                        labelPlacement="start"
                        sx={{ justifyContent: 'space-between', ml: 0, width: '100%', mt: 2, pt: 2, borderTop: '1px solid var(--color-border)' }}
                    />
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

            {/* Push notification enable dialog */}
            <Dialog open={pushModalOpen} onClose={handlePushRefuse} maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '16px' } } }}>
                <DialogTitle sx={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontWeight: 700 }}>
                    Enable Push Notifications?
                </DialogTitle>
                <DialogContent>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                        Would you like to receive browser notifications for KickSneak so you never miss an update?
                    </p>
                </DialogContent>
                <DialogActions sx={{ padding: '12px 24px' }}>
                    <Button onClick={handlePushRefuse} sx={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)' }}>Not Now</Button>
                    <Button
                        onClick={handlePushConfirm}
                        variant="contained"
                        sx={{
                            background: 'var(--color-secondary)', color: '#000', fontFamily: 'var(--font-display)',
                            borderRadius: '100px',
                            '&:hover': { background: '#fff' },
                        }}
                    >
                        Enable
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};