import NavKeys from '@/constants/navkeys';
import { LogsConfig } from '../types';

export const outletLogsConfig: LogsConfig = {
  entity: 'outlet',
  title: 'Outlet Logs',
  breadcrumbLabel: 'Outlets',
  breadcrumbPath: NavKeys.Outlets,
  backPath: NavKeys.Outlets,
  tableId: 'outlet-logs-table',
  emptyStateText: 'No logs found for this outlet.',
  loadingTitle: 'Outlet Logs',
  loadingText: 'Loading outlet logs...',
  errorTitle: 'Outlet Logs',
  errorText: 'Error loading outlet logs. Please try again.',
};

export const verificationLogsConfig: LogsConfig = {
  entity: 'outlet',
  title: 'Verification Document Logs',
  breadcrumbLabel: 'Outlets',
  breadcrumbPath: NavKeys.Outlets,
  backPath: NavKeys.Outlets,
  tableId: 'verification-logs-table',
  emptyStateText: 'No logs found for this verification document.',
  loadingTitle: 'Verification Logs',
  loadingText: 'Loading verification document logs...',
  errorTitle: 'Verification Logs',
  errorText: 'Error loading verification logs. Please try again.',
  description: 'Tax verification document change history',
};

export const warehouseLogsConfig: LogsConfig = {
  entity: 'warehouse',
  title: 'Warehouse Logs',
  breadcrumbLabel: 'Warehouses',
  breadcrumbPath: NavKeys.Warehouse,
  backPath: NavKeys.Warehouse,
  tableId: 'warehouse-logs-table',
  emptyStateText: 'No logs found for this warehouse.',
  loadingTitle: 'Warehouse Logs',
  loadingText: 'Loading warehouse logs...',
  errorTitle: 'Warehouse Logs',
  errorText: 'Error loading warehouse logs. Please try again.',
};

export const userLogsConfig: LogsConfig = {
  entity: 'users',
  title: 'User Logs',
  breadcrumbLabel: 'Users',
  breadcrumbPath: NavKeys.Users,
  backPath: NavKeys.Users,
  tableId: 'user-logs-table',
  emptyStateText: 'No logs found for this user.',
  loadingTitle: 'User Logs',
  loadingText: 'Loading user logs...',
  errorTitle: 'User Logs',
  errorText: 'Error loading user logs. Please try again.',
  module: 'users',
  action: 'log',
};

export const masterGroupsLogsConfig: LogsConfig = {
  entity: 'groups',
  title: 'Master Groups Logs',
  breadcrumbLabel: 'Master Groups',
  breadcrumbPath: NavKeys.MasterGroups,
  backPath: NavKeys.MasterGroups,
  tableId: 'master-groups-logs-table',
  emptyStateText: 'No logs found for this master group.',
  loadingTitle: 'Master Groups Logs',
  loadingText: 'Loading master group logs...',
  errorTitle: 'Master Groups Logs',
  errorText: 'Error loading master group logs. Please try again.',
  description: 'Master group change history',
};

export const permissionGroupsLogsConfig: LogsConfig = {
  entity: 'permissionGroups',
  title: 'Permission Groups Logs',
  breadcrumbLabel: 'Permission Groups',
  breadcrumbPath: NavKeys.PermissionGroups,
  backPath: NavKeys.PermissionGroups,
  tableId: 'permission-groups-logs-table',
  emptyStateText: 'No logs found for this permission group.',
  loadingTitle: 'Permission Groups Logs',
  loadingText: 'Loading permission group logs...',
  errorTitle: 'Permission Groups Logs',
  errorText: 'Error loading permission group logs. Please try again.',
  description: 'Permission group change history',
};

export const permissionsLogsConfig: LogsConfig = {
  entity: 'permissions',
  title: 'Permissions Logs',
  breadcrumbLabel: 'Permissions',
  breadcrumbPath: NavKeys.Permissions,
  backPath: NavKeys.Permissions,
  tableId: 'permissions-logs-table',
  emptyStateText: 'No logs found for this permission.',
  loadingTitle: 'Permissions Logs',
  loadingText: 'Loading permission logs...',
  errorTitle: 'Permissions Logs',
  errorText: 'Error loading permission logs. Please try again.',
  description: 'Permission change history',
};

export const productsLogsConfig: LogsConfig = {
  entity: 'products',
  title: 'Products Logs',
  breadcrumbLabel: 'Products',
  breadcrumbPath: NavKeys.DashboardProducts,
  backPath: NavKeys.DashboardProducts,
  tableId: 'products-logs-table',
  emptyStateText: 'No logs found for this product.',
  loadingTitle: 'Products Logs',
  loadingText: 'Loading product logs...',
  errorTitle: 'Products Logs',
  errorText: 'Error loading product logs. Please try again.',
};

export const masterSchemasLogsConfig: LogsConfig = {
  entity: 'schemas',
  title: 'Master Schema Logs',
  breadcrumbLabel: 'Master Schema',
  breadcrumbPath: NavKeys.MasterSchema,
  backPath: NavKeys.MasterSchema,
  tableId: 'master-schema-logs-table',
  emptyStateText: 'No logs found for this master schema.',
  loadingTitle: 'Master Schema Logs',
  loadingText: 'Loading master schema logs...',
  errorTitle: 'Master Schema Logs',
  errorText: 'Error loading master schema logs. Please try again.',
  description: 'Master schema change history',
};

export const masterRecordsLogsConfig: LogsConfig = {
  entity: 'records',
  title: 'Master Records Logs',
  breadcrumbLabel: 'Master Records',
  breadcrumbPath: NavKeys.MasterRecords,
  backPath: NavKeys.MasterRecords,
  tableId: 'master-records-logs-table',
  emptyStateText: 'No logs found for this master record.',
  loadingTitle: 'Master Records Logs',
  loadingText: 'Loading master record logs...',
  errorTitle: 'Master Records Logs',
  errorText: 'Error loading master record logs. Please try again.',
  description: 'Master record change history',
};

