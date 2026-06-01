'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import Loading from '../ui/loading';
import { useDispatch } from 'react-redux';
import {
  setAuthData,
  setDefaultGroupedPermissions,
  setGroupedPermissions,
  setGroupedPermissionsLoading,
} from '@/store/slices/authSlice';
import { getAuthFromLocalStorage } from '@/utils/auth-utils';
import { permissionGroupsApi } from '@/features/user-managment/permission-groups/api/permission-groups';
import { shouldFetchUserPermissions } from '@/utils/env';
import { isAxiosError } from 'axios';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const isNetworkError = (error: unknown) =>
  isAxiosError(error) && !error.response && Boolean(error.request);

export const ProtectedRoute = ({
  children,
  redirectTo = '/',
}: ProtectedRouteProps) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const {
    isAuthenticated: isReduxAuthenticated,
    user,
    groupedPermissionsLoading,
  } = useAppSelector((state) => state.auth);

  const fetchUserPermissions = async (userId: string) => {
    try {
      dispatch(setGroupedPermissionsLoading(true));
      const permissionData = await permissionGroupsApi.getByUserId(userId);

      if (permissionData?.data) {
        const permissionGroupDetails =
          permissionData.data.permissionGroupDetails || [];

        dispatch(
          setGroupedPermissions({
            permissionGroupDetails,
          })
        );
      } else {
        dispatch(setGroupedPermissions({ permissionGroupDetails: [] }));
      }
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) {
        dispatch(setGroupedPermissions({ permissionGroupDetails: [] }));
        return;
      }

      if (isNetworkError(error)) {
        console.warn(
          `Permission API unreachable for user ${userId}; using default local permissions.`
        );
        dispatch(setDefaultGroupedPermissions());
        return;
      }

      console.error('Failed to fetch user permissions:', error);
      dispatch(setGroupedPermissions({ permissionGroupDetails: [] }));
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
  }, [dispatch, redirectTo, router]);

  useEffect(() => {
    if (isAuthenticated && shouldFetchUserPermissions(user?.userId)) {
      fetchUserPermissions(user!.userId!);
    }
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    if (!isReduxAuthenticated && isAuthenticated) {
      setIsAuthenticated(false);
      router.replace(redirectTo);
    }
  }, [isReduxAuthenticated, isAuthenticated, router, redirectTo]);

  const awaitingPermissions =
    isAuthenticated &&
    shouldFetchUserPermissions(user?.userId) &&
    groupedPermissionsLoading;

  if (!isAuthenticated || awaitingPermissions) {
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
