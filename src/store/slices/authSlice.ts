import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ILoginResponse } from '@/features/auth/types/auth.types';
import { DEFAULT_GROUPED_PERMISSIONS } from '@/constants/permissions';

interface IAuthState extends ILoginResponse {
  isAuthenticated: boolean;
  groupedPermissions: Record<string, string[]>;
  groupedPermissionsMap: Record<string, boolean>;
  groupedPermissionsLoading: boolean;
  isSuperAdmin: boolean;
}

const initialState: IAuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  idToken: null,
  refreshToken: null,
  groupedPermissions: {},
  groupedPermissionsMap: {},
  groupedPermissionsLoading: false,
  isSuperAdmin: false,
};

const isSuperAdminUser = (permissionGroupDetails: any[]): boolean => {
  if (!permissionGroupDetails || !Array.isArray(permissionGroupDetails)) {
    return false;
  }
  
  return permissionGroupDetails.some((group) => {
    const name = (group?.name || '').toLowerCase().trim();
    if (!name) return false;
    

    const hasSuperAdmin = 
      name.includes('superadmin') || 
      name.includes('super admin') || 
      name.includes('super-admin');
    
    const hasAllPermissions = 
      name.includes('all permissions') || 
      name.includes('allpermissions') || 
      name.includes('all-permissions');
    
    const isSuperAdmin = hasSuperAdmin && hasAllPermissions;
    
    return isSuperAdmin;
  });
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setIsAuthenticated(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
    },
    setAuthData(state, action: PayloadAction<Partial<ILoginResponse>>) {
      state.isAuthenticated = !!action.payload.accessToken;
      state.user = action.payload.user || null;
      state.accessToken = action.payload.accessToken || null;
      state.idToken = action.payload.idToken || null;
      state.refreshToken = action.payload.refreshToken || null;

      if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'LOCAL' || action.payload.user?.userId === 'admin') {
        const grouped: Record<string, string[]> = { ...DEFAULT_GROUPED_PERMISSIONS };
        const groupedMap: Record<string, boolean> = {};

        Object.entries(grouped).forEach(([resource, actions]) => {
          actions.forEach((action) => {
            groupedMap[`${resource}:${action}`] = true;
          });
        });

        state.groupedPermissions = grouped;
        state.groupedPermissionsMap = groupedMap;
        state.groupedPermissionsLoading = false;
      } else {
        state.groupedPermissions = {};
        state.groupedPermissionsMap = {};
        state.groupedPermissionsLoading = true;
      }
    },
    setGroupedPermissionsLoading(state, action: PayloadAction<boolean>) {
      state.groupedPermissionsLoading = action.payload;
    },
    setGroupedPermissions(
      state,
      action: PayloadAction<{ permissionGroupDetails: any[] }>
    ) {
      const grouped: Record<string, string[]> = {};
      const groupedMap: Record<string, boolean> = {};

      const permissionGroupDetails = action.payload.permissionGroupDetails || [];
      state.isSuperAdmin = isSuperAdminUser(permissionGroupDetails);
      
      const permissions: string[] =
        action.payload.permissionGroupDetails?.flatMap(
          (g: { permissions?: string[] }) => g?.permissions || []
        ) || [];

      permissions.forEach((permissionCode: string) => {
        if (permissionCode && typeof permissionCode === 'string') {
          const parts = permissionCode.split(':');

          if (parts.length === 2) {
            const [resource, actionName] = parts;
            if (resource && actionName) {
              if (!grouped[resource]) grouped[resource] = [];
              grouped[resource].push(actionName);

              groupedMap[`${resource}:${actionName}`] = true;
            }
            return;
          }

          if (parts.length === 3) {
            const [device, resource, actionName] = parts;
            if (!device || !resource || !actionName) return;

            if (device.toLowerCase() !== 'web') return;

            if (!grouped[resource]) grouped[resource] = [];
            grouped[resource].push(actionName);

            groupedMap[`${resource}:${actionName}`] = true;
            return;
          }

        }
      });

      state.groupedPermissions = grouped;
      state.groupedPermissionsMap = groupedMap;
      state.groupedPermissionsLoading = false;
    },
    clearAuthData(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.idToken = null;
      state.refreshToken = null;
      state.groupedPermissions = {};
      state.groupedPermissionsMap = {};
      state.groupedPermissionsLoading = false;
      state.isSuperAdmin = false;
    },
  },
});

export const {
  setIsAuthenticated,
  setAuthData,
  setGroupedPermissionsLoading,
  setGroupedPermissions,
  clearAuthData,
} = authSlice.actions;
export default authSlice.reducer;
