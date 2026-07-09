import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'placeholder-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'placeholder.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'placeholder',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'placeholder.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:placeholder',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Resolves once Firebase has finished restoring (or confirming the absence of) a
// persisted session. On a cold page load `auth.currentUser` is null until this fires,
// so any request sent before then would go out without a token and get a 401.
// Callers (e.g. the axios interceptor) await this before reading `auth.currentUser`.
export const authReady = new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
    });
});