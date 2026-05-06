import { useEntityLogs } from '@/features/logs/hooks/useEntityLogs';
import { LogsConfig, LogEntry } from '../types';

interface UseLogsDataProps {
  config: LogsConfig;
  enabled?: boolean;
}

export const useLogsData = ({ config, enabled = true }: UseLogsDataProps) => {
  const { data: logs, isLoading, error } = useEntityLogs({
    entity: config.entity,
    entityId: config.entityId,
    metaTags: config.metaTags,
    enabled: enabled && !!config.entityId,
  });


  const items = logs?.data?.items ?? [];

  const tableData: LogEntry[] = items.map((log: any, index: number) => ({
    id: index + 1,
    title: log.title || '-',
    description: log.description || '-',
    createdAt: log.createdAt,
    dateTime: new Date(log.createdAt).toLocaleString(),
    performedBy: log.metaData?.updatedBy?.name || 
                log.metaData?.updatedBy || 
                log.performedBy?.name || 
                log.performedBy?.id || 
                'Unknown User',
    actionType: log.type || log.action || 'created',
    fullLog: log,
  }));

  return {
    data: tableData,
    isLoading,
    error,
    items,
  };
};