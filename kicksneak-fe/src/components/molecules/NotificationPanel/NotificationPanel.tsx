import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Chip } from '@mui/material';
import {
    NotificationsNone,
    TrendingDown, LocalShipping,
    Handshake, AutoAwesome, Info, DoneAll,
} from '@mui/icons-material';
import { useNotificationStore } from '../../../store/notificationStore';
import type { AppNotification, NotificationType } from '../../../types/notification';
import styles from './NotificationPanel.module.css';

interface NotificationPanelProps {
    variant: 'dropdown' | 'popup';
    onClose?: () => void;
}

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
    price_drop: <TrendingDown sx={{ fontSize: 16 }} />,
    order: <LocalShipping sx={{ fontSize: 16 }} />,
    offer: <Handshake sx={{ fontSize: 16 }} />,
    recommendation: <AutoAwesome sx={{ fontSize: 16 }} />,
    system: <Info sx={{ fontSize: 16 }} />,
};

const TYPE_COLOR: Record<NotificationType, string> = {
    price_drop: '#22c55e',
    order: 'var(--color-secondary)',
    offer: 'var(--color-accent)',
    recommendation: '#a78bfa',
    system: 'var(--color-text-muted)',
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export const NotificationPanel = ({ variant, onClose }: NotificationPanelProps) => {
    const navigate = useNavigate();
    const { items, unreadCount, markRead, markAllRead, fetchNotifications } = useNotificationStore();

    useEffect(() => { fetchNotifications(); }, []);

    const handleClick = (n: AppNotification) => {
        markRead(n.id);
        navigate(n.href);
        onClose?.();
    };

    return (
        <div className={`${styles.panel} ${styles[variant]}`}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.title}>Notifications</span>
                    {unreadCount > 0 && (
                        <Chip
                            label={unreadCount}
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: '0.6rem',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                background: 'var(--color-secondary)',
                                color: 'var(--color-bg)',
                            }}
                        />
                    )}
                </div>
                {unreadCount > 0 && (
                    <button className={styles.markAll} onClick={markAllRead}>
                        <DoneAll sx={{ fontSize: 14 }} />
                        Mark all read
                    </button>
                )}
            </div>

            <div className={styles.list}>
                {items.length === 0 ? (
                    <div className={styles.empty}>
                        <NotificationsNone sx={{ fontSize: 40, color: 'var(--color-text-muted)', mb: 1 }} />
                        <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                            No notifications yet
                        </Typography>
                    </div>
                ) : (
                    items.slice(0, 20).map((n, i) => (
                        <button
                            key={n.id}
                            className={`${styles.item} ${!n.read ? styles.itemUnread : ''}`}
                            onClick={() => handleClick(n)}
                            style={{ animationDelay: `${i * 40}ms` }}
                        >
                            <span
                                className={styles.typeIcon}
                                style={{ color: TYPE_COLOR[n.type], background: `${TYPE_COLOR[n.type]}18` }}
                            >
                                {TYPE_ICON[n.type]}
                            </span>
                            <div className={styles.itemContent}>
                                <span className={styles.itemTitle}>{n.title}</span>
                                <span className={styles.itemMsg}>{n.message}</span>
                                <span className={styles.itemTime}>{timeAgo(n.createdAt)}</span>
                            </div>
                            {!n.read && <span className={styles.unreadDot} />}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};