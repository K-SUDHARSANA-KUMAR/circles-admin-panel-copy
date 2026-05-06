import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { apiEndPoint } from '@/features/apiEndPoint';

interface UseEntityLogsParams {
  entity: string;
  entityId?: string;
  metaTags?: Record<string, string | undefined>;
  enabled?: boolean;
}

export const useEntityLogs = ({ entity, entityId, metaTags, enabled = true }: UseEntityLogsParams) => {
  return useQuery({
    queryKey: ['entity-logs', entity, entityId, metaTags],
    queryFn: async () => {
      const params = new URLSearchParams({ entity });

      // Use metaTags.<entity>Id as required by endpoint
      // Only append entityId if it's not already provided in metaTags
      if (entityId) {
        if (entity === 'warehouse') {
          // Only add if not already in metaTags
          if (!metaTags?.warehouseId) {
            params.append('metaTags.warehouseId', entityId);
          }
        } else if (entity === 'outlet') {
          // Only add if not already in metaTags
          if (!metaTags?.outletId) {
            params.append('metaTags.outletId', entityId);
          }
        } else if (entity === 'users') {
          // Only add if not already in metaTags
          if (!metaTags?.UserId) {
            params.append('metaTags.UserId', entityId);
          }
        } else if (entity === 'groups') {
          // Only add if not already in metaTags
          if (!metaTags?.groupId) {
            params.append('metaTags.groupId', entityId);
          }
        } else if (entity === 'permissionGroups') {
          // Only add if not already in metaTags
          if (!metaTags?.permissionGroupId) {
            params.append('metaTags.permissionGroupId', entityId);
          }
        } else if (entity === 'permissions') {
          // Only add if not already in metaTags
          if (!metaTags?.permissionId) {
            params.append('metaTags.permissionId', entityId);
          }
        } else if (entity === 'schemas') {
          // Only add if not already in metaTags
          if (!metaTags?.schemaName) {
            params.append('metaTags.schemaName', entityId);
          }
        } else if (entity === 'records') {
          // For records, we need to construct the dynamic metaTag based on schemaName
          // The metaTags should already contain the correct {schemaName}Id
          // No need to add entityId here as it's handled by metaTags
        } else {
          // fallback to <entity>Id for other entities
          params.append(`${entity}Id`, entityId);
        }
      }

      // Append any extra metaTags filters
      if (metaTags) {
        Object.entries(metaTags).forEach(([key, value]) => {
          if (value) params.append(`metaTags.${key}`, value);
        });
      }
      
      // Use appropriate logs endpoint based on entity type
      const endpoint = entity === 'users' 
        ? apiEndPoint.LOGS_USER_ENDPOINT 
        : entity === 'groups' || entity === 'schemas' || entity === 'records'
        ? apiEndPoint.LOGS_MDM_ENDPOINT
        : entity === 'permissionGroups' || entity === 'permissions'
        ? apiEndPoint.LOGS_USER_ENDPOINT
        : apiEndPoint.LOGS_PARTNER_ENDPOINT;
      
      if (!endpoint) {
        throw new Error(`Logs endpoint not configured for ${entity} service`);
      }
      
      const url = `${endpoint}?${params.toString()}`;
      
      
      const response = await axios.get(url);
      return response.data;
    },
    enabled: enabled && !!entity,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
};
