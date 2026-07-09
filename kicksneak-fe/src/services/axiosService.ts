import axios from 'axios';
import { auth, authReady } from '../config/firebase';

export const httpClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
    timeout: 10_000,
    headers: {
        'Content-Type': 'application/json',
    },
});

httpClient.interceptors.request.use(async (config) => {
    try {
        // Wait for Firebase to restore the persisted session before reading the user,
        // otherwise cold-load requests race ahead of auth and come back 401.
        await authReady;
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch {
    }
    return config;
});

httpClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('[HTTP Error]', error?.response?.status, error?.message);
        return Promise.reject(error);
    }
);