import { UserTypeEnum } from "@/constants/enums/user.enums";

export interface Permission {
  id: string;
  name: string;
  description: string;
  code: string;
}

export interface PermissionGroup {
  id: string,
  userType?: UserTypeEnum;
  permissionGroupId: string;
  name: string;
  description: string;
  roleId: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface UsePermissionGroupsParams {
  search?: string;
  status?: string;
  userType?: UserTypeEnum;
  roleId?: string;
  skip?: number;
  limit?: number;
  nonPaginated?: boolean;
  isActive?: boolean;
}