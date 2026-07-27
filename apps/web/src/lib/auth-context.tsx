'use client';
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, query, where, collection, getDocs, limit } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getUserFromToken(firebaseUser: FirebaseUser): Promise<User | null> {
  const tokenResult = await firebaseUser.getIdTokenResult(true);
  const claims = tokenResult.claims as any;
  const tenantId = claims.tenantId;

  if (!tenantId) {
    return null;
  }

  const personDoc = await getDoc(doc(db, 'tenants', tenantId, 'people', firebaseUser.uid));
  if (personDoc.exists()) {
    return { id: personDoc.id, ...personDoc.data(), tenantId } as User;
  }

  const email = firebaseUser.email;
  if (email) {
    const q = query(
      collection(db, 'tenants', tenantId, 'people'),
      where('email', '==', email),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data(), tenantId } as User;
    }
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const loginResolveRef = useRef<(() => void) | null>(null);

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await getUserFromToken(firebaseUser);
          if (userData) {
            setUser(userData);
            setAuthError(null);
          } else {
            setAuthError('Your account is not properly configured. Please contact your administrator.');
            setUser(null);
          }
        } catch {
          setAuthError('Failed to load user profile. Please try again.');
          setUser(null);
        }
      } else {
        setUser(null);
        setAuthError(null);
      }
      setLoading(false);
      if (loginResolveRef.current) {
        loginResolveRef.current();
        loginResolveRef.current = null;
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    return new Promise<void>((resolve, reject) => {
      loginResolveRef.current = () => resolve();
      signInWithEmailAndPassword(auth, email, password).then(async (result) => {
        const token = await result.user.getIdToken(true);
        const tokenResult = await result.user.getIdTokenResult(true);
        const role = (tokenResult.claims as any)?.role || 'resident';
        document.cookie = `opsora_token=${token}; path=/; max-age=3600; SameSite=Lax`;
        document.cookie = `opsora_role=${role}; path=/; max-age=3600; SameSite=Lax`;

        const tenantId = (tokenResult.claims as any)?.tenantId;
        if (!tenantId) {
          loginResolveRef.current = null;
          await signOut(auth);
          reject(new Error('Your account is not properly configured. Please contact your administrator.'));
        }
      }).catch((err) => {
        loginResolveRef.current = null;
        reject(err);
      });
    });
  };

  const logout = async () => {
    await signOut(auth);
    document.cookie = 'opsora_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'opsora_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, clearAuthError, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
