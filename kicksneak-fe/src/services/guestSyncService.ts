import type { CartItem, ProductItem } from '../types/product';
import { httpClient } from './axiosService';
import { ApiRoutes } from './apiRoutes';
import { localStorageService } from './localStorageService';
import { useCartStore } from '../store/cartStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { cartLineMatches, unionCartLines } from './cartLineMatch';

// Called once right after a user logs in. Pushes whatever the guest built up in
// localStorage (favorites + cart) into the account, then pulls the merged
// server state back down as the new source of truth (store + localStorage).
// Every step is best-effort and idempotent: only local items missing from the
// server are added, so running it twice (e.g. on a later reload) is a no-op.
export async function mergeGuestDataOnLogin(): Promise<void> {
    await Promise.all([mergeFavorites(), mergeCart()]);
}

async function mergeFavorites(): Promise<void> {
    const local = localStorageService.get<ProductItem[]>('favorites_items') ?? [];

    let serverItems: ProductItem[] = [];
    try {
        serverItems = (await httpClient.get<{ items: ProductItem[] }>(ApiRoutes.favorites)).data.items ?? [];
    } catch { /* offline / first call — treat server as empty */ }

    const serverIds = new Set(serverItems.map((i) => i.id));
    for (const fav of local) {
        if (serverIds.has(fav.id)) continue;
        try {
            await httpClient.post(ApiRoutes.favoritesToggle(), { productId: fav.id });
        } catch { /* skip the ones that fail, keep going */ }
    }

    try {
        const server = (await httpClient.get<{ items: ProductItem[] }>(ApiRoutes.favorites)).data.items ?? [];
        // Union: server state plus any local favorites the server didn't accept —
        // whatever the guest saved must never vanish at login.
        const serverIdsAfter = new Set(server.map((i) => i.id));
        const merged = [...server, ...local.filter((i) => !serverIdsAfter.has(i.id))];
        localStorageService.set('favorites_items', merged);
        useFavoritesStore.setState({ items: merged, initialized: true });
    } catch { /* keep local as-is if the final fetch fails */ }
}

async function mergeCart(): Promise<void> {
    const local = localStorageService.get<CartItem[]>('cart_items') ?? [];

    let serverItems: CartItem[] = [];
    try {
        serverItems = (await httpClient.get<{ items: CartItem[] }>(ApiRoutes.cart)).data.items ?? [];
    } catch { /* treat as empty */ }

    // Match on content (name+size) so we don't double-add a line the account
    // already has — the server DTO exposes no productId to key on.
    for (const item of local) {
        if (serverItems.some((s) => cartLineMatches(item, s))) continue;
        try {
            await httpClient.post(ApiRoutes.cartAdd, {
                productId: item.productId ?? null,
                sizeLabel: item.size ?? null,
                stockItemId: item.stockItemId ?? null,
                usedItemId: item.usedItemId ?? null,
            });
        } catch { /* skip failures */ }
    }

    try {
        const server = (await httpClient.get<{ items: CartItem[] }>(ApiRoutes.cart)).data.items ?? [];
        // Union: server entries plus any local lines the server couldn't take
        // (e.g. no resolvable stock) — the guest's cart must survive login intact.
        const merged = unionCartLines(server, local);
        localStorageService.set('cart_items', merged);
        useCartStore.setState({ items: merged, initialized: true });
    } catch { /* keep local as-is */ }
}
