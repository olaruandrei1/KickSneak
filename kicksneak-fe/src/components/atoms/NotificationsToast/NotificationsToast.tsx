import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../../store/notificationStore';
import { wsService } from '../../../services/wsService';
import { useAuthStore } from '../../../store/authStore';
import type { AppNotification } from '../../../types/notification';
import styles from './NotificationToast.module.css';

export const NotificationToast = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { addNew } = useNotificationStore();
    const [toast, setToast] = useState<AppNotification | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        wsService.connect(user?.uid ?? 'anonymous');

        const unsub = wsService.on('new_notification', ({ payload }) => {
            const n = payload!.notification as AppNotification;
            addNew(n);
            setToast(n);
            setVisible(true);
            setTimeout(() => setVisible(false), 4500);
            setTimeout(() => setToast(null), 5000);
        });

        return unsub;
    }, [user?.uid]);

    if (!toast) return null;

    return (
        <div
            className={`${styles.toast} ${visible ? styles.toastIn : styles.toastOut}`}
            onClick={() => { navigate(toast.href); setVisible(false); }}
        >
            <div className={styles.dot} />
            <div className={styles.content}>
                <span className={styles.title}>{toast.title}</span>
                <span className={styles.msg}>{toast.message}</span>
            </div>
            <button
                className={styles.close}
                onClick={(e) => { e.stopPropagation(); setVisible(false); }}
            >
                ✕
            </button>
        </div>
    );
};