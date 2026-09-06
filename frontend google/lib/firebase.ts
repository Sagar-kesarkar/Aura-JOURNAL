import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App singleton
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

/**
 * Sign in with Google OAuth Popup
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      throw new Error('Google Sign-In popup was blocked by browser. Please allow popups or use Demo Mode.');
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain (localhost) is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.');
    }
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google Sign-In provider is not enabled in Firebase Console -> Authentication -> Sign-in method.');
    }
    throw error;
  }
}

/**
 * Sign in anonymously for preview / guest mode
 */
export async function loginAsGuest(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error: any) {
    console.error('Anonymous Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign out current authenticated user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type User, app };
