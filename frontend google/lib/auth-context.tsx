'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  loginWithGoogle,
  loginAsGuest,
  logoutUser,
  onAuthStateChanged,
  type User,
} from './firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

interface AuthContextValue {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  firebaseUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInAsGuest: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setFirebaseUser(authUser);
        setUser({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
          isAnonymous: authUser.isAnonymous,
        });
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    const authUser = await loginWithGoogle();
    setFirebaseUser(authUser);
    setUser({
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
      isAnonymous: authUser.isAnonymous,
    });
  };

  const handleGuestSignIn = async () => {
    const authUser = await loginAsGuest();
    setFirebaseUser(authUser);
    setUser({
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
      isAnonymous: authUser.isAnonymous,
    });
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } finally {
      try {
        localStorage.removeItem('aura-demo-entries');
        localStorage.removeItem('aura-drafts-v2');
        localStorage.removeItem('aura-draft');
        sessionStorage.clear();
      } catch (err) {
        console.warn('Storage clear notice:', err);
      }
      setUser(null);
      setFirebaseUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signInWithGoogle: handleGoogleSignIn,
        signInAsGuest: handleGuestSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
