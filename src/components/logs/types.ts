export interface LogsConfig {
  entity: string;
  entityId?: string;
  metaTags?: Record<string, string | undefined>;
  title: string;
  breadcrumbLabel: string;
  breadcrumbPath: string;
  backPath: string;
  tableId: string;
  emptyStateText: string;
  loadingTitle: string;
  loadingText: string;
  errorTitle: string;
  errorText: string;
  description?: string;
  module?: string;
  action?: string;
  customBreadcrumbItems?: Array<{
    label: string;
    href?: string;
    isPage?: boolean;
  }>;
}

export interface LogsComponentProps {
  config: LogsConfig;
  enabled?: boolean;
}

export interface LogEntry {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  dateTime: string;
  performedBy: string;
  actionType: string;
  fullLog: any;
}
