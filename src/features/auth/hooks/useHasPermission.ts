import { useAppSelector } from "@/store/hooks";

export const usePermissionList = (resource: string): string[] => {
  const grouped = useAppSelector((state) => state.auth.groupedPermissions);
  return grouped[resource] || [];
};

export const usePermissionChecker = (resource: string) => {
  const permissions = usePermissionList(resource);

  return {
    has: (action: string) => permissions.includes(action),
    hasAny: (actions: string[]) => actions.some((a) => permissions.includes(a)),
    hasAll: (actions: string[]) => actions.every((a) => permissions.includes(a)),
  };
};

export const useOptimizedPermissionChecker = () => {
  const permissionsMap = useAppSelector(
    (state) => state.auth.groupedPermissionsMap
  );
  const isSuperAdmin = useAppSelector((state) => state.auth.isSuperAdmin);

  return {
    has: (resource: string, action: string) => {
      if (isSuperAdmin) {
        return true;
      }
      if(process.env.NEXT_PUBLIC_ENVIRONMENT === 'LOCAL') {
        return true;
      }
      return permissionsMap[`${resource}:${action}`] === true;
    },
    hasAny: (resource: string, actions: string[]) => {
      if (isSuperAdmin) {
        return true;
      }
      if(process.env.NEXT_PUBLIC_ENVIRONMENT === 'LOCAL') {
        return true;
      }
      return actions.some(
        (action) => permissionsMap[`${resource}:${action}`] === true,
      );
    },
    hasAll: (resource: string, actions: string[]) => {
      if (isSuperAdmin) {
        return true;
      }
      if(process.env.NEXT_PUBLIC_ENVIRONMENT === 'LOCAL') {
        return true;
      }
      return actions.every(
        (action) => permissionsMap[`${resource}:${action}`] === true
      );
    },
  };
};

export const useHasPermission = (resource: string, action: string): boolean => {
  const permissionsMap = useAppSelector(
    (state) => state.auth.groupedPermissionsMap
  );
  return permissionsMap[`${resource}:${action}`] === true;
};
