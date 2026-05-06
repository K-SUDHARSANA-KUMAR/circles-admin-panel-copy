import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsApi, Collection, CollectionsFilters, HandoverRequest } from '../api/collections';

export const useCollections = (filters?: CollectionsFilters) => {
  const queryClient = useQueryClient();

  const collections = useQuery({
    queryKey: ['collections', filters],
    queryFn: () => collectionsApi.getAll(filters),
    enabled: true,
  });

  const collectionById = useQuery({
    queryKey: ['collection-by-id', filters],
    queryFn: ({ queryKey }) => collectionsApi.getById(queryKey[1] as string),
    enabled: false,
  });

  const updateCollection = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Collection> }) =>
      collectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const deleteCollection = useMutation({
    mutationFn: collectionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const handoverPayments = useMutation({
    mutationFn: (data: HandoverRequest) => collectionsApi.handover(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  return {
    collections,
    collectionById,
    updateCollection,
    deleteCollection,
    handoverPayments,
    isLoading: collections.isLoading,
    error: collections.error,
    data: collections.data?.data?.items || [],
    totalItems: collections.data?.data?.totalItems || 0,
    totalPages: collections.data?.data?.totalPages || 0,
  };
};

export const useInvoicesByIds = (invoiceIds?: string[]) => {
  return useQuery({
    queryKey: ['invoices', invoiceIds],
    queryFn: () => collectionsApi.getInvoicesByIds(invoiceIds || []),
    enabled: !!invoiceIds && invoiceIds.length > 0,
  });
};