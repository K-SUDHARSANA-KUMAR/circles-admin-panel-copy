import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configurationsApi } from '../api/configurations';

export const useConfigurations = (params?: {
  skip?: number;
  limit?: number;
  search?: string;
}) => {
  const queryClient = useQueryClient();

  const configurations = useQuery({
    queryKey: ['configurations', params],
    queryFn: () => configurationsApi.getAll(params),
  });

  const getConfiguration = (contextName: string) => {
    return useQuery({
      queryKey: ['configuration', contextName],
      queryFn: () => configurationsApi.getByContext(contextName),
      enabled: !!contextName,
    });
  };

  const updateConfiguration = useMutation({
    mutationFn: ({ configId, data }: { configId: string; data: any }) =>
      configurationsApi.patchByConfigId(configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations'] });
      queryClient.invalidateQueries({ queryKey: ['configuration'] });
    },
  });

  return {
    configurations,
    getConfiguration,
    updateConfiguration,
  };
};

export const useConfigurationByContext = (contextName: string | null) => {
  return useQuery({
    queryKey: ['configuration', contextName],
    queryFn: () => configurationsApi.getByContext(contextName!),
    enabled: !!contextName,
  });
};
