'use client';

import NavKeys from '@/constants/navkeys';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { useMasterSchema } from '@/features/master-managment/hooks/useMasterSchema';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { FieldTypes } from '@/constants/master-schema';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setMasterRecords } from '@/store/slices/masterRecordsSlice';
import { generateColumns } from '@/components/data-tables/master-records/columns';
import { EnrichedRecord } from '../_types';
import { MasterRecordFilters } from '@/features/master-managment/types/master.types';
import { ActiveStatusCell } from '@/components/data-tables/master-records/cells/active-status-cell';

export interface UseMasterRecordsPageResult {
  schemaName: string | null;
  search: string;
  setSearch: (value: string) => void;
  searchFields: string[];
  schemaFields: any[];
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  handlePaginationChange: (newPagination: PaginationState) => void;
  columns: ColumnDef<EnrichedRecord>[];
  enrichedData: EnrichedRecord[];
  paginationData: { totalPages: number; totalItems: number } | undefined;
  isLoading: boolean;
  selectedMasterValues: Record<string, string>;
  handleMasterRecordChange: (masterType: string, value: string) => void;
  handleAddNew: () => void;
}

const getRecordId = (record: any, schemaName: string | null): string => {
  if (!schemaName) return (record as any)._id || (record as any).id || '';

  const lowercaseId = `${schemaName}Id`;
  if (record[lowercaseId]) return record[lowercaseId];

  const camelCaseId = `${schemaName.charAt(0).toUpperCase()}${schemaName.slice(1)}Id`;
  if (record[camelCaseId]) return record[camelCaseId];

  return (record as any)._id || (record as any).id || '';
};

export const useMasterRecordsPage = (): UseMasterRecordsPageResult => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schemaName = searchParams.get('schemaName');

  const { schemas, schemaById } = useMasterSchema(schemaName || undefined);
  const { recordMaps } = useAppSelector((state) => state.masterRecords);
  const dispatch = useAppDispatch();

  // Load transportmode master records when viewing grade masters
  const { records: transportModeRecords } = useMasterRecords(
    'transportmode',
    undefined,
    0,
    1000,
    true
  );

  // Store transportmode records in Redux when viewing grade masters
  const transportModeDataSignatureRef = useRef<string>('')
  useEffect(() => {
    if (schemaName === 'grade' && transportModeRecords?.data && Array.isArray(transportModeRecords.data)) {
      // Create a stable signature to compare using transportModeName
      const dataSignature = JSON.stringify(
        transportModeRecords.data.map((r: any) => r.transportModeName || '').sort()
      );
      if (transportModeDataSignatureRef.current !== dataSignature) {
        transportModeDataSignatureRef.current = dataSignature;
        dispatch(setMasterRecords({
          masterName: 'transportmode',
          records: transportModeRecords.data
        }));
      }
    }
  }, [schemaName, transportModeRecords?.data, dispatch]);

  const [pagination, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [selectedMasterValues, setSelectedMasterValues] = useState<
    Record<string, string>
  >({});
  const [filters, setFilters] = useState<MasterRecordFilters>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch('');
  }, [schemaName]);

  const searchFields = useMemo(() => {
    const fields = schemaById?.data?.data?.fields || [];
    return fields
      .filter((f: any) => f?.type !== FieldTypes.Boolean)
      .map((f: any) => f?.name)
      .filter((n: any) => typeof n === 'string' && n.length > 0);
  }, [schemaById?.data?.data?.fields]);

  const schemaFields = useMemo(() => {
    return (schemaById?.data?.data?.fields || []) as any[];
  }, [schemaById?.data?.data?.fields]);

  const { records, pagination: paginationData } = useMasterRecords(
    schemaName || '',
    undefined,
    pagination.pageIndex * pagination.pageSize,
    pagination.pageSize,
    false,
    filters,
    undefined,
    search && searchFields.length > 0
      ? { term: search, fields: searchFields as string[] }
      : undefined,
    undefined,
    true // showAll=true for master records page
  );

  const [columns, setColumns] = useState<ColumnDef<EnrichedRecord>[]>([]);

  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (schemaName && schemaById?.data?.data?.fields) {
      const generatedColumns = generateColumns(
        schemaById.data.data.fields,
        pagination.pageIndex,
        pagination.pageSize,
        recordMaps,
        schemaName
      );

      let finalColumns = [...generatedColumns];
      const schema = schemaById.data.data;  // Add this line to properly reference the schema

      if (schema.hasOwnProperty('isActive')) {
        const isActiveCol = {
          header: 'Is Active',
          accessorKey: 'isActive',
          cell: ({ row }: any) => {
            const isActive = row.getValue('isActive');
            // Get the dynamic ID field based on schema
            const recordId = getRecordId(row.original, schemaName);

            return ActiveStatusCell({
              value: isActive,
              schemaName: schemaName,
              recordId: recordId
            });
          },
          align: 'center',
        };

        // Try to find an "actions" column by common markers
        const actionIndex = finalColumns.findIndex((col: any) =>
          col?.accessorKey === 'actions' ||
          col?.id === 'actions' ||
          col?.header === 'Actions' ||
          (typeof col?.header === 'string' && col.header.toLowerCase().includes('action'))
        );

        const insertIndex = actionIndex >= 0 ? actionIndex : Math.max(0, finalColumns.length - 1);
        finalColumns.splice(insertIndex, 0, isActiveCol);
      }

      setColumns(finalColumns as ColumnDef<EnrichedRecord>[]);
    }
  }, [schemaName, schemaById?.data?.data, pagination.pageIndex, pagination.pageSize, recordMaps]);

  const enrichedData = useMemo(() => {
    console.log(records.data, '<< Master Records Data');
    if (records.data && Array.isArray(records.data)) {
      return records.data.map((record) => ({
        ...record,
        id: (record as any)._id || '',
        onEdit: () => {
          const recordId = getRecordId(record, schemaName);
          routerRef.current.push(
            `${NavKeys.MasterRecordsManage}?edit=${recordId}&schemaName=${schemaName}&id=${recordId}`
          );
        },
        onViewLogs: () => {
          const recordId = getRecordId(record, schemaName);
          const groupId = (record as any).groupId || '';
          routerRef.current.push(
            `${NavKeys.MasterRecordsLogs}?recordId=${recordId}&schemaName=${schemaName}&groupId=${groupId}`
          );
        },
      }));
    }
    return [] as EnrichedRecord[];
  }, [records.data, schemaName]);

  const handleAddNew = () => {
    if (!schemaName) return;
    router.push(`${NavKeys.MasterRecordsManage}?schemaName=${schemaName}`);
  };

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPaginationState(newPagination);
  };

  const handleMasterRecordChange = (masterType: string, value: string) => {
    setSelectedMasterValues((prev) => ({
      ...prev,
      [masterType]: value,
    }));

    const filterKey = `${masterType}Id`;
    if (value && value !== 'select-master') {
      setFilters((prev) => ({
        ...prev,
        [filterKey]: value,
      }));
    } else {
      setFilters((prev) => {
        const newFilters = { ...prev } as Record<string, string>;
        delete newFilters[filterKey];
        return newFilters as MasterRecordFilters;
      });
    }

    setPaginationState((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  };

  return {
    schemaName,
    search,
    setSearch,
    searchFields,
    schemaFields,
    pagination,
    setPagination: setPaginationState,
    handlePaginationChange,
    columns,
    enrichedData,
    paginationData: paginationData as any,
    isLoading:
      schemas.isLoading ||
      (!!schemaName && !!schemaById?.isLoading) ||
      records.isLoading,
    selectedMasterValues,
    handleMasterRecordChange,
    handleAddNew,
  };
};
