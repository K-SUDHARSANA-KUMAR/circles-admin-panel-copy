export type PermissionOption = {
  label: string;
  value: string;
};

export const PERMISSION_MODULE_OPTIONS: PermissionOption[] = [
  { label: 'Orders', value: 'orders' },
  { label: 'Outlets', value: 'outlets' },
  { label: 'PJP', value: 'pjp' },
  { label: 'Products', value: 'products' },
  { label: 'Claims', value: 'claims' },
  { label: 'Schemes', value: 'schemes' },
  { label: 'Advertisement', value: 'advertisement' },
  { label: 'Warehouse', value: 'warehouse' },
  { label: 'Users', value: 'users' },
  { label: 'Permission Groups', value: 'permission-groups' },
  { label: 'Permissions', value: 'permissions' },
  { label: 'Master Schema', value: 'master-schema' },
  { label: 'Master Groups', value: 'master-groups' },
  { label: 'Master Records', value: 'master-records' },
  { label: 'Claims Config', value: 'claims-config' },
  { label: 'Configurations', value: 'configurations' },
  { label: 'Reports', value: 'reports' },
  { label: 'Form Management', value: 'form-management' },
  { label: 'PJP Config', value: 'pjp-config' },
  { label: 'Outlet Config', value: 'outlet-config' },
  { label: 'User Hierarchy', value: 'user-hierarchy' },
  { label: 'Customer Group', value: 'customer-group' },
];

export const PERMISSION_CODE_OPTIONS: PermissionOption[] = [
  { label: 'View', value: 'view' },
  { label: 'Create', value: 'create' },
  { label: 'Edit', value: 'edit' },
  { label: 'Delete', value: 'delete' },
  { label: 'Log', value: 'log' },
];
