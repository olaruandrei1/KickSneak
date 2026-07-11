import { create } from 'zustand';
import type { CartItem } from '../types/product';
import { localStorageService } from '../services/localStorageService';
import { httpClient } from '../services/axiosService';
import { ApiRoutes } from '../services/apiRoutes';
import { useNotificationStore } from './notificationStore';
import { useAuthStore } from './authStore';
import { unionCartLines } from '../services/cartLineMatch';

interface CartState {
    items: CartItem[];
    initialized: boolean;
    addItem: (item: CartItem) => Promise<void>;
    removeItem: (id: string) => Promise<void>;
    clearCart: () => void;
    fetchCart: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: localStorageService.get<CartItem[]>('cart_items') ?? [],
    initialized: false,

    addItem: async (item) => {
        const existing = get().items.find((i) => i.id === item.id);
        const optimistic = existing
            ? get().items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
            : [...get().items, item];
        localStorageService.set('cart_items', optimistic);
        set({ items: optimistic });

        // Guest: keep the cart in localStorage only. It gets merged into the
        // account on login (see guestSyncService). No API call, no error toast.
        if (!useAuthStore.getState().user) return;

        try {
            const res = await httpClient.post<{ items: CartItem[] }>(ApiRoutes.cartAdd, {
                productId: item.productId ?? null,
                sizeLabel: item.size ?? null,
                stockItemId: item.stockItemId ?? null,
                usedItemId: item.usedItemId ?? null,
            });
            // Union with the optimistic list: lines the server doesn't hold
            // (guest-era items it couldn't resolve) must not disappear.
            const merged = unionCartLines(res.data.items ?? [], optimistic);
            localStorageService.set('cart_items', merged);
            set({ items: merged });
        } catch {
            localStorageService.set('cart_items', get().items);
            set({ items: get().items });
            useNotificationStore.getState().addNew({ id: Date.now().toString(), type: 'system', title: 'Error', message: 'Failed to update cart.', href: '/cart', read: false, createdAt: new Date().toISOString() });
        }
    },

    removeItem: async (id) => {
        const optimistic = get().items.filter((i) => i.id !== id);
        localStorageService.set('cart_items', optimistic);
        set({ items: optimistic });

        // Guest: localStorage only.
        if (!useAuthStore.getState().user) return;

        try {
            const res = await httpClient.delete<{ items: CartItem[] }>(ApiRoutes.cartRemove(id));
            // Union with the optimistic list (which already excludes the removed
            // line) so local-only guest items survive server round-trips.
            const merged = unionCartLines(res.data.items ?? [], optimistic);
            localStorageService.set('cart_items', merged);
            set({ items: merged });
        } catch {
            localStorageService.set('cart_items', get().items);
            set({ items: get().items });
            useNotificationStore.getState().addNew({ id: Date.now().toString(), type: 'system', title: 'Error', message: 'Failed to remove from cart.', href: '/cart', read: false, createdAt: new Date().toISOString() });
        }
    },

    clearCart: () => {
        localStorageService.remove('cart_items');
        set({ items: [] });
    },

    fetchCart: async () => {
        if (get().initialized) return;
        // Guest: nothing to fetch — the localStorage cart is the source of truth.
        if (!useAuthStore.getState().user) { set({ initialized: true }); return; }
        try {
            const res = await httpClient.get<{ items: CartItem[] }>(ApiRoutes.cart);
            // Union with what's already saved locally — the server may not hold
            // lines added as guest, and those must not vanish on refresh.
            const local = localStorageService.get<CartItem[]>('cart_items') ?? [];
            const merged = unionCartLines(res.data.items ?? [], local);
            localStorageService.set('cart_items', merged);
            set({ items: merged, initialized: true });
        } catch {
            set({ initialized: true });
        }
    },
}));