import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterSchemaApi } from '../api/master-schema';
import { CreateSchemaPayload } from '../api/master-schema';

export const useMasterSchema = (schemaName?: string, editMode?: string, groupId?: string) => {
  const queryClient = useQueryClient();

  const schemas = useQuery({
    queryKey: ['master-schemas'],
    queryFn: () => masterSchemaApi.getAll({ nonPaginated: true }),
  });

  const schemaById = useQuery({
    queryKey: ['master-schema-by-id', schemaName, editMode],
    queryFn: ({ queryKey }) => masterSchemaApi.getSchemaById(queryKey[1] as string),
    enabled: !!schemaName,
  });

  const schemasByGroup = useQuery({
    queryKey: ['master-schemas-by-group', groupId],
    queryFn: ({ queryKey }) => masterSchemaApi.getSchemasByGroupId(queryKey[1] as string),
    enabled: !!groupId,
  });

  const createSchema = useMutation({
    mutationFn: masterSchemaApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-schemas'] });
    }
  });

  const updateSchema = useMutation({
    mutationFn: ({ schemaId, data }: { schemaId: string; data: CreateSchemaPayload }) =>
      masterSchemaApi.update(schemaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-schemas'] });
    }
  });

  const deleteSchema = useMutation({
    mutationFn: masterSchemaApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-schemas'] });
    }
  });

  return {
    schemas,
    schemaById,
    schemasByGroup,
    createSchema,
    updateSchema,
    deleteSchema
  };
}; 