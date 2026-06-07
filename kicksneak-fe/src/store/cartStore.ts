import { create } from 'zustand';
import type { CartItem } from '../types/product';
import { localStorageService } from '../services/localStorageService';
import { httpClient } from '../services/axiosService';
import { ApiRoutes } from '../services/apiRoutes';

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

        try {
            const res = await httpClient.post<{ items: CartItem[] }>(ApiRoutes.cartAdd, {
                productId: item.productId ?? null,
                sizeLabel: item.size ?? null,
                stockItemId: item.stockItemId ?? null,
                usedItemId: item.usedItemId ?? null,
            });
            localStorageService.set('cart_items', res.data.items);
            set({ items: res.data.items });
        } catch {
            localStorageService.set('cart_items', get().items);
        }
    },

    removeItem: async (id) => {
        const optimistic = get().items.filter((i) => i.id !== id);
        localStorageService.set('cart_items', optimistic);
        set({ items: optimistic });

        try {
            const res = await httpClient.delete<{ items: CartItem[] }>(ApiRoutes.cartRemove(id));
            localStorageService.set('cart_items', res.data.items);
            set({ items: res.data.items });
        } catch {
            localStorageService.set('cart_items', get().items);
        }
    },

    clearCart: () => {
        localStorageService.remove('cart_items');
        set({ items: [] });
    },

    fetchCart: async () => {
        if (get().initialized) return;
        try {
            const res = await httpClient.get<{ items: CartItem[] }>(ApiRoutes.cart);
            localStorageService.set('cart_items', res.data.items);
            set({ items: res.data.items, initialized: true });
        } catch {
            set({ initialized: true });
        }
    },
}));