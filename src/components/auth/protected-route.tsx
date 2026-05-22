'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setAuthData } from '@/store/slices/authSlice';
import { getAuthFromLocalStorage } from '@/utils/auth-utils';
import Loading from '../ui/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute = ({
  children,
  redirectTo = '/',
}: ProtectedRouteProps) => {
  const router = useRouter();
  const dispatch = useDispatch();
  // isInitialized prevents the loading screen from flashing "Redirecting..."
  // before the auth check even runs on mount.
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // TODO: Replace with real API-based auth verification when the backend
    // login endpoint is ready. For now we rely on the localStorage flag set
    // by the mock login bypass in useLogin.ts.
    const isLocalAuthenticated =
      localStorage?.getItem('isAuthenticated') === 'true';

    if (isLocalAuthenticated) {
      // Restore auth + permission state into Redux from localStorage so that
      // permission checks throughout the app continue to work correctly.
      dispatch(setAuthData(getAuthFromLocalStorage()));
      setIsAuthenticated(true);
    } else {
      router.replace(redirectTo);
    }

    // Mark initialisation complete *after* the auth decision so the loading
    // screen never resolves to a blank/unauthenticated state for one frame.
    setIsInitialized(true);
  }, []); // Empty dep array — runs exactly once on mount, zero circular risk.

  // Keep showing the loader until the localStorage check completes.
  // We intentionally do NOT gate on groupedPermissionsLoading here because
  // the permissions API is still under development and would cause an infinite
  // loading screen when unavailable.
  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loading text="Verifying Authentication" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};