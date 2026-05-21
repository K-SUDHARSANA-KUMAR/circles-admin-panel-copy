'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import Loading from '../ui/loading';
import { useDispatch } from 'react-redux';
import {
  setAuthData,
  setGroupedPermissions,
  setGroupedPermissionsLoading,
} from '@/store/slices/authSlice';
import { getAuthFromLocalStorage } from '@/utils/auth-utils';
import { permissionGroupsApi } from '@/features/user-managment/permission-groups/api/permission-groups';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const {
    isAuthenticated: isReduxAuthenticated,
    user,
    groupedPermissionsLoading,
  } = useAppSelector((state) => state.auth);

  // Fetch user permissions from API
  const fetchUserPermissions = async (userId: string) => {
    try {
      dispatch(setGroupedPermissionsLoading(true));
      const permissionData = await permissionGroupsApi.getByUserId(userId);

      if (permissionData?.data) {
        const permissionGroupDetails = permissionData.data.permissionGroupDetails || [];
        
        dispatch(
          setGroupedPermissions({
            permissionGroupDetails,
          })
        );
      } else {
        console.warn('No permission data found in API response');
        dispatch(setGroupedPermissions({ permissionGroupDetails: [] }));
      }
    } catch (error: any) {
      // Handle 404 errors gracefully - user might not have permission groups assigned
      if (error?.response?.status === 404) {
        console.warn(`No permission groups found for user ${userId}`);
        dispatch(setGroupedPermissions({ permissionGroupDetails: [] }));
      } else {
        console.error('Failed to fetch user permissions:', error);
        dispatch(setGroupedPermissions({ permissionGroupDetails: [] }));
      }
    } finally {
      dispatch(setGroupedPermissionsLoading(false));
    }
  };

  useEffect(() => {
    const isLocalAuthenticated =
      localStorage?.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(isLocalAuthenticated);
    
    if (!isLocalAuthenticated) {
      router.replace(redirectTo);
    } else {
      dispatch(setAuthData(getAuthFromLocalStorage()));
    }
    
    // Mark as hydrated to allow logout listener to function
    setHasHydrated(true);
  }, [dispatch, router, redirectTo]);

  useEffect(() => {
    if (
      isAuthenticated &&
      user?.userId &&
      user?.userId !== 'admin' &&
      process.env.NEXT_PUBLIC_ENVIRONMENT !== 'LOCAL'
    ) {
      fetchUserPermissions(user.userId);
    }
  }, [isAuthenticated, user?.userId]);

  // Listen to Redux store changes for logout
  useEffect(() => {
    if (hasHydrated && !isReduxAuthenticated && isAuthenticated) {
      // Check if local storage is also cleared to avoid race condition during hydration
      const isLocalAuthenticated = localStorage?.getItem('isAuthenticated') === 'true';
      if (!isLocalAuthenticated) {
        setIsAuthenticated(false);
        router.replace(redirectTo);
      }
    }
  }, [hasHydrated, isReduxAuthenticated, isAuthenticated, router, redirectTo]);

  const isWaitingForPermissions = 
    process.env.NEXT_PUBLIC_ENVIRONMENT !== 'LOCAL' &&
    groupedPermissionsLoading &&
    user?.userId !== 'admin';

  // Show loading while authenticating or while permissions are loading
  if (!isAuthenticated || isWaitingForPermissions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loading
            text={
              !isAuthenticated
                ? 'Verifying Authentication'
                : 'Loading Permissions'
            }
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
