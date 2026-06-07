import { create } from 'zustand';
import type { ProductItem } from '../types/product';
import { localStorageService } from '../services/localStorageService';
import { httpClient } from '../services/axiosService';
import { ApiRoutes } from '../services/apiRoutes';

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

        try {
            const res = await httpClient.post<{ items: ProductItem[] }>(
                ApiRoutes.favoritesToggle(),
                { productId: item.id }
            );
            const synced = res.data.items;
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
        try {
            const res = await httpClient.get<{ items: ProductItem[] }>(ApiRoutes.favorites);
            localStorageService.set('favorites_items', res.data.items);
            set({ items: res.data.items, initialized: true });
        } catch {
            set({ initialized: true });
        }
    },
}));