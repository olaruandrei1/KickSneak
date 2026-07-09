import React, { useEffect, useState } from 'react';
import { notificationHubService } from '../services/notificationHubService';
import type { LiveNotification } from '../services/notificationHubService';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import type { AppNotification, NotificationType } from '../types/notification';
import { LiveNotificationCard } from '../components/molecules/LiveNotificationCard';
import { createPortal } from 'react-dom';

const KNOWN_TYPES: NotificationType[] = ['price_drop', 'order', 'offer', 'recommendation', 'system'];

const toAppNotification = (n: LiveNotification): AppNotification => ({
    id: `live_${Date.now()}`,
    type: KNOWN_TYPES.includes(n.type as NotificationType) ? (n.type as NotificationType) : 'system',
    title: n.title,
    message: n.message,
    href: n.href || '/',
    read: false,
    createdAt: n.createdAt ?? new Date().toISOString(),
});

export const LiveNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuthStore();
    const [currentNotification, setCurrentNotification] = useState<LiveNotification | null>(null);

    useEffect(() => {
        if (!user) return;
        
        // Wait for Firebase token. In authStore, the token is managed by firebase, but we can get it.
        // Actually, the authStore doesn't expose getToken directly, let's use the native firebase auth.
        import('../config/firebase').then(({ auth }) => {
            auth.currentUser?.getIdToken().then((token: string) => {
                notificationHubService.ensureConnection(token);
                
                notificationHubService.onNotification((notif: LiveNotification) => {
                    setCurrentNotification(notif);
                    // Also drop it into the bell store so the badge updates instantly —
                    // the toast alone disappears after 6s and is easy to miss.
                    useNotificationStore.getState().addNew(toAppNotification(notif));
                });
            });
        });

        return () => {
            notificationHubService.disconnect();
        };
    }, [user]);

    return (
        <>
            {children}
            {currentNotification && createPortal(
                <LiveNotificationCard
                    key={currentNotification.createdAt} // force remount if new one arrives
                    title={currentNotification.title}
                    message={currentNotification.message}
                    onClick={() => {
                        // Provider mounts outside the router, so navigate the hard way.
                        const href = currentNotification.href || '/';
                        setCurrentNotification(null);
                        if (href !== '/') window.location.assign(href);
                    }}
                    onClose={() => setCurrentNotification(null)}
                />,
                document.body
            )}
        </>
    );
};
