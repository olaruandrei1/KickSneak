import { localStorageService } from './localStorageService';
import type { ProductItem } from '../types/product';

const MAX_ITEMS = 20;
const KEY = 'recently_viewed';

export interface RecentlyViewedEntry {
    card: ProductItem;
    detailSnap: Partial<ProductDetailSnap>;
    viewedAt: string;
}

// Snapshot minim din product detail — salvat la fiecare vizita
export interface ProductDetailSnap {
    lowestAsk: number;
    lastSale: number;
    sizes: SizeOption[];
    colorways: ColorwayOption[];
}

export interface SizeOption {
    label: string;
    price: number | null; 
}

export interface ColorwayOption {
    id: string;
    name: string;
    image: string;
    price: number;
}

export const recentlyViewedService = {
    getAll(): RecentlyViewedEntry[] {
        return localStorageService.get<RecentlyViewedEntry[]>(KEY) ?? [];
    },

    add(card: ProductItem, detailSnap?: Partial<ProductDetailSnap>): void {
        const current = this.getAll().filter((e) => e.card.id !== card.id);
        const entry: RecentlyViewedEntry = {
            card,
            detailSnap: detailSnap ?? {},
            viewedAt: new Date().toISOString(),
        };
        const updated = [entry, ...current].slice(0, MAX_ITEMS);
        localStorageService.set(KEY, updated);
    },

    getCards(): ProductItem[] {
        return this.getAll().map((e) => e.card);
    },
};