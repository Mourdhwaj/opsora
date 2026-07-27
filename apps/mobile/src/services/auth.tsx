import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken(true);
        await SecureStore.setItemAsync('opsora_token', token);

        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const claims = tokenResult.claims as any;
        const tenantId = claims.tenantId;

        if (tenantId) {
          const personDoc = await firestore()
            .collection('tenants')
            .doc(tenantId)
            .collection('people')
            .doc(firebaseUser.uid)
            .get();

          if (personDoc.exists()) {
            setUser({ id: firebaseUser.uid, ...personDoc.data(), tenantId } as User);
          } else if (firebaseUser.email) {
            const snap = await firestore()
              .collection('tenants')
              .doc(tenantId)
              .collection('people')
              .where('email', '==', firebaseUser.email)
              .limit(1)
              .get();
            if (!snap.empty) {
              const doc = snap.docs[0];
              setUser({ id: doc.id, ...doc.data(), tenantId } as User);
            }
          }
        }
      } else {
        await SecureStore.deleteItemAsync('opsora_token');
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const result = await auth().signInWithEmailAndPassword(email, password);
    const token = await result.user.getIdToken(true);
    await SecureStore.setItemAsync('opsora_token', token);
  };

  const logout = async () => {
    await auth().signOut();
    await SecureStore.deleteItemAsync('opsora_token');
    await SecureStore.deleteItemAsync('opsora_role');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
