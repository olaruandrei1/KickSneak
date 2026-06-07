import { localStorageService } from './localStorageService';
import { httpClient } from './axiosService';

interface CachedFetchOptions<T> {
    key: string;
    url: string;
    onData: (data: T, source: 'cache' | 'api') => void;
    compare?: (cached: T, fresh: T) => boolean;
}

function defaultCompare<T>(a: T, b: T): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export async function cachedFetch<T>({
    key,
    url,
    onData,
    compare = defaultCompare,
}: CachedFetchOptions<T>): Promise<void> {
    const cached = localStorageService.get<T>(key);
    if (cached !== null) {
        onData(cached, 'cache');
    }

    try {
        const response = await httpClient.get<T>(url);
        const fresh = response.data;

        if (cached === null || !compare(cached, fresh)) {
            localStorageService.set(key, fresh);
            onData(fresh, 'api');
        }
    } catch (err) {
        console.warn(`[cachedFetch] Failed for key "${key}":`, err);
    }
}