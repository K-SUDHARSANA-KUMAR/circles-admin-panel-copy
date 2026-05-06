import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterRecordsApi } from '../api/master-records';
import { MasterRecordFilters } from '../types/master.types';

export const useMasterRecords = (
  masterName: string,
  recordId?: string,
  skip: number = 0,
  limit: number = 10,
  nonPaginated: boolean = false,
  filters?: MasterRecordFilters,
  userId?: string,
  search?: { term: string; fields: string[] },
  instanceKey?: string, // Optional: For cache isolation (used only in Product Criteria)
  showAll: boolean = false
) => {
  const queryClient = useQueryClient();

  const records = useQuery({
    queryKey: [
      'master-records',
      masterName,
      skip,
      limit,
      nonPaginated,
      filters,
      userId,
      search,
      instanceKey, // Add to cache key only when provided
      showAll,
    ],
    queryFn: () =>
      masterRecordsApi.getAll(
        masterName,
        skip,
        limit,
        nonPaginated,
        filters,
        userId,
        search,
        showAll
      ),
    enabled: !!masterName,
  });

  const recordById = useQuery({
    queryKey: ['master-record-by-id', masterName, recordId],
    queryFn: () => masterRecordsApi.getById(masterName, recordId as string),
    enabled: !!masterName && !!recordId,
  });

  const createRecord = useMutation({
    mutationFn: masterRecordsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['master-records', masterName],
      });
    },
  });

  const updateRecord = useMutation({
    mutationFn: masterRecordsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['master-records', masterName],
      });
    },
  });

  const deleteRecord = useMutation({
    mutationFn: ({
      masterName,
      recordId,
    }: {
      masterName: string;
      recordId: string;
    }) => masterRecordsApi.delete(masterName, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['master-records', masterName],
      });
    },
  });

  const patchIsActive = useMutation({
    mutationFn: ({
      masterName,
      recordId,
      isActive,
    }: {
      masterName: string;
      recordId: string;
      isActive: boolean;
    }) => masterRecordsApi.patchIsActive(masterName, recordId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['master-records', masterName],
      });
    },
  });

  // Extract items from either paginated response ({ items, totalItems, ... })
  // or non-paginated array response ([])
  const dataRaw: any = records.data as any;
  const isPaginated = !!dataRaw && typeof dataRaw === 'object' && Array.isArray((dataRaw as any).items);
  const recordsData = Array.isArray(dataRaw)
    ? dataRaw
    : isPaginated
      ? (dataRaw.items as any[])
      : [];

  const pagination = isPaginated
    ? {
        totalItems: dataRaw.totalItems,
        totalPages: dataRaw.totalPages,
        skip: dataRaw.skip,
        limit: dataRaw.limit,
      }
    : null;

  return {
    records: {
      ...records,
      data: recordsData,
    },
    pagination,
    recordById,
    createRecord,
    updateRecord,
    deleteRecord,
    patchIsActive,
  };
};

export const useBrands = (brandId?: string, filters?: MasterRecordFilters, userId?: string) => {
  return useMasterRecords('brand', brandId, 0, 1000, true, filters, userId);
};

export const useCategories = (categoryId?: string, filters?: MasterRecordFilters, userId?: string) => {
  return useMasterRecords('category', categoryId, 0, 1000, true, filters, userId);
};

export const useSubcategories = (subcategoryId?: string, filters?: MasterRecordFilters, userId?: string) => {
  return useMasterRecords('subcategory', subcategoryId, 0, 1000, true, filters, userId);
};

export const usePackages = (packageId?: string, filters?: MasterRecordFilters, userId?: string) => {
  return useMasterRecords('package', packageId, 0, 1000, true, filters, userId);
}; 

export const useModules = (packageId?: string, filters?: MasterRecordFilters, userId?: string) => {
  return useMasterRecords('package', packageId, 0, 1000, true, filters, userId);
}; 