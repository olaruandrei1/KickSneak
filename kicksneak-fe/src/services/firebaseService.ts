import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { localStorageService } from './localStorageService';
import { httpClient } from './axiosService';
import { ApiRoutes } from './apiRoutes';

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

const mapUser = (user: User): AuthUser => ({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
});

// Trimite tokenul la backend — creează userul în DB dacă nu există
const provisionUser = async (user: User): Promise<void> => {
    try {
        const token = await user.getIdToken();
        await httpClient.post(ApiRoutes.authLogin(), {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (err) {
        console.error('[AUTH] Backend provision failed:', err);
    }
};

export const firebaseService = {
    async loginWithGoogle(): Promise<AuthUser> {
        const result = await signInWithPopup(auth, googleProvider);
        await provisionUser(result.user);
        const user = mapUser(result.user);
        localStorageService.set('auth_user', user);
        return user;
    },

    async loginWithEmail(email: string, password: string): Promise<AuthUser> {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await provisionUser(result.user);
        const user = mapUser(result.user);
        localStorageService.set('auth_user', user);
        return user;
    },

    async register(email: string, password: string): Promise<AuthUser> {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await provisionUser(result.user);
        const user = mapUser(result.user);
        localStorageService.set('auth_user', user);
        return user;
    },

    async logout(): Promise<void> {
        await signOut(auth);
        localStorageService.remove('auth_user');
    },

    async deleteAccount(): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;
        // Șterge din backend primul
        const token = await user.getIdToken();
        await httpClient.delete(ApiRoutes.authDeleteAccount(), {
            headers: { Authorization: `Bearer ${token}` },
        });
        // Apoi din Firebase
        await user.delete();
        localStorageService.remove('auth_user');
    },

    onAuthChanged(callback: (user: AuthUser | null) => void): () => void {
        return onAuthStateChanged(auth, (user) => {
            callback(user ? mapUser(user) : null);
        });
    },

    getCachedUser(): AuthUser | null {
        return localStorageService.get<AuthUser>('auth_user');
    },
};