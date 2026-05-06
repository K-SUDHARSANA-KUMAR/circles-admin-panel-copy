import { useAppSelector } from "@/store/hooks";

/**
 * Mock version of usePermissionList - Returns an empty array but we bypass checks elsewhere
 */
export const usePermissionList = (resource: string): string[] => {
  const grouped = useAppSelector((state) => state.auth.groupedPermissions);
  return grouped[resource] || [];
};

/**
 * Bypass Permission Checker - Always returns true for all permission checks
 */
export const usePermissionChecker = (resource: string) => {
  // const permissions = usePermissionList(resource);

  return {
    has: (action: string) => true, // Always grant access
    hasAny: (actions: string[]) => true, // Always grant access
    hasAll: (actions: string[]) => true, // Always grant access
  };
};

/**
 * Bypass Optimized Permission Checker - Always returns true for all permission checks
 */
export const useOptimizedPermissionChecker = () => {
  // const permissionsMap = useAppSelector((state) => state.auth.groupedPermissionsMap);
  // const isSuperAdmin = useAppSelector((state) => state.auth.isSuperAdmin);

  return {
    has: (resource: string, action: string) => true,
    hasAny: (resource: string, actions: string[]) => true,
    hasAll: (resource: string, actions: string[]) => true,
  };
};

/**
 * Bypass hasPermission - Always returns true
 */
export const useHasPermission = (resource: string, action: string): boolean => {
  // const permissionsMap = useAppSelector((state) => state.auth.groupedPermissionsMap);
  // return permissionsMap[`${resource}:${action}`] === true;
  return true;
};
