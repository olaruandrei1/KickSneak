import { create } from 'zustand';
import type { AppNotification } from '../types/notification';
import { localStorageService } from '../services/localStorageService';
import { cachedFetch } from '../services/cachedFetchService';
import { ApiRoutes } from '../services/apiRoutes';

interface NotificationState {
    items: AppNotification[];
    unreadCount: number;
    open: boolean;
    setOpen: (v: boolean) => void;
    setItems: (items: AppNotification[]) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    addNew: (n: AppNotification) => void;
    fetchNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    items: localStorageService.get<AppNotification[]>('notifications') ?? [],
    unreadCount: 0,
    open: false,

    setOpen: (v) => set({ open: v }),

    setItems: (items) => {
        const safeItems = Array.isArray(items) ? items : [];
        const unreadCount = safeItems.filter((n) => !n.read).length;
        localStorageService.set('notifications', safeItems);
        set({ items: safeItems, unreadCount });
    },

    markRead: (id) => {
        const items = get().items.map((n) =>
            n.id === id ? { ...n, read: true } : n
        );
        const unreadCount = items.filter((n) => !n.read).length;
        localStorageService.set('notifications', items);
        set({ items, unreadCount });
    },

    markAllRead: () => {
        const items = get().items.map((n) => ({ ...n, read: true }));
        localStorageService.set('notifications', items);
        set({ items, unreadCount: 0 });
    },

    addNew: (n) => {
        const items = [n, ...get().items].slice(0, 20);
        const unreadCount = items.filter((x) => !x.read).length;
        localStorageService.set('notifications', items);
        set({ items, unreadCount });
    },

    fetchNotifications: () => {
        cachedFetch<{ unreadCount: number; items: AppNotification[] }>({
            key: 'notifications',
            url: ApiRoutes.notifications,
            onData: (data) => {
                const items = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.items)
                        ? data.items
                        : [];

                const unreadCount = items.filter((n) => !n.read).length;
                localStorageService.set('notifications', items);
                set({ items, unreadCount });
            },
        });
    },
}));