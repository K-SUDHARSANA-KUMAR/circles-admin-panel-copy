'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { setAuthData } from '@/store/slices/authSlice';
import { getAuthFromLocalStorage } from '@/utils/auth-utils';

function StoreRehydrator({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // Auto-populate mock admin session for full auth bypass
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('accessToken', 'mock-access-token');
        localStorage.setItem('user', JSON.stringify({ 
          userId: 'admin', 
          userName: 'Super Admin',
          role: 'SUPER_ADMIN',
          isSuperAdmin: true 
        }));
      }

      const authData = getAuthFromLocalStorage();
      if (authData.accessToken) {
        dispatch(setAuthData(authData));
      }
    }
  }, [dispatch]);

  return <>{children}</>;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <StoreRehydrator>{children}</StoreRehydrator>
    </Provider>
  );
} 