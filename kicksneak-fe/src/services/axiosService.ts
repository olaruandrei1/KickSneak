import axios from 'axios';
import { auth } from '../config/firebase';

export const httpClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
    timeout: 10_000,
    headers: {
        'Content-Type': 'application/json',
    },
});

httpClient.interceptors.request.use(async (config) => {
    try {
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