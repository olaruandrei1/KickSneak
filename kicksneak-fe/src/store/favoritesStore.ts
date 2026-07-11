import { create } from 'zustand';
import type { ProductItem } from '../types/product';
import { localStorageService } from '../services/localStorageService';
import { httpClient } from '../services/axiosService';
import { ApiRoutes } from '../services/apiRoutes';
import { useAuthStore } from './authStore';

interface FavoritesState {
    items: ProductItem[];
    initialized: boolean;
    toggleFavorite: (item: ProductItem) => Promise<void>;
    isFavorite: (id: string) => boolean;
    fetchFavorites: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
    items: localStorageService.get<ProductItem[]>('favorites_items') ?? [],
    initialized: false,

    toggleFavorite: async (item) => {
        const exists = get().items.find((i) => i.id === item.id);
        const optimistic = exists
            ? get().items.filter((i) => i.id !== item.id)
            : [...get().items, item];
        localStorageService.set('favorites_items', optimistic);
        set({ items: optimistic });

        // Guest: keep favorites in localStorage only (no rollback). They get
        // merged into the account on login (see guestSyncService).
        if (!useAuthStore.getState().user) return;

        try {
            const res = await httpClient.post<{ items: ProductItem[] }>(
                ApiRoutes.favoritesToggle(),
                { productId: item.id }
            );
            // Union with the optimistic list so favorites the server doesn't
            // hold (guest-era ones) aren't dropped by this round-trip.
            const server = res.data.items ?? [];
            const serverIds = new Set(server.map((i) => i.id));
            const synced = [...server, ...optimistic.filter((i) => !serverIds.has(i.id))];
            localStorageService.set('favorites_items', synced);
            set({ items: synced });
        } catch {
            // Rollback
            const prev = exists
                ? [...get().items, item]
                : get().items.filter((i) => i.id !== item.id);
            localStorageService.set('favorites_items', prev);
            set({ items: prev });
        }
    },

    isFavorite: (id) => !!get().items.find((i) => i.id === id),

    fetchFavorites: async () => {
        if (get().initialized) return;
        // Guest: localStorage favorites are the source of truth.
        if (!useAuthStore.getState().user) { set({ initialized: true }); return; }
        try {
            const res = await httpClient.get<{ items: ProductItem[] }>(ApiRoutes.favorites);
            // Union with local favorites so guest-saved ones survive refreshes.
            const server = res.data.items ?? [];
            const local = localStorageService.get<ProductItem[]>('favorites_items') ?? [];
            const serverIds = new Set(server.map((i) => i.id));
            const merged = [...server, ...local.filter((i) => !serverIds.has(i.id))];
            localStorageService.set('favorites_items', merged);
            set({ items: merged, initialized: true });
        } catch {
            set({ initialized: true });
        }
    },
}));