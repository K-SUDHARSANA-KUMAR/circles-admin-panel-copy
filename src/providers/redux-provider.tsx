'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { setAuthData } from '@/store/slices/authSlice';
import { getAuthFromLocalStorage } from '@/utils/auth-utils';

function StoreRehydrator({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // Auto-populate mock admin session for full auth bypass
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('accessToken', 'mock-access-token');
        localStorage.setItem('user', JSON.stringify({ 
          userId: 'admin', 
          name: 'Super Admin',
          userName: 'Super Admin',
          roleName: 'SUPER_ADMIN',
          role: 'SUPER_ADMIN',
          isSuperAdmin: true 
        }));
      }

      const authData = getAuthFromLocalStorage();
      if (authData.accessToken) {
        dispatch(setAuthData(authData));
      }
      setMounted(true);
    }
  }, [dispatch]);

  if (!mounted) {
    return null; // Return null on server and initial client render to guarantee zero hydration mismatches
  }

  return <>{children}</>;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <StoreRehydrator>{children}</StoreRehydrator>
    </Provider>
  );
} 