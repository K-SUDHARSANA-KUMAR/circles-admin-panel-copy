import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outletsApi } from '../api/outlets';
import { Outlet, OutletsResponse, UseOutletsParams } from '../types/outlet.types';

// Utility functions to handle field inconsistencies
export const getOutletTypeId = (outlet: Outlet): string => {
  return outlet.businessTypeId || outlet.businesstypeId || '';
};

export const getWarehouseId = (outlet: Outlet): string => {
  return (
    outlet.warehouseId ||
    (outlet.warehouseIds && outlet.warehouseIds.length > 0
      ? outlet.warehouseIds[0].warehouseId
      : '')
  );
};

export const normalizeOutlet = (
  outlet: Outlet
): Outlet & {
  normalizedOutletTypeId: string;
  normalizedWarehouseId: string;
} => {
  return {
    ...outlet,
    normalizedOutletTypeId: getOutletTypeId(outlet),
    normalizedWarehouseId: getWarehouseId(outlet),
  };
};

// Hook to fetch approval data for a specific outlet (by outletId), using outletsApi.getApprovals
export const useOutletApprovals = (entityId: string, approverId?: string, approverRoleId?: string, status?: string) => {
  return useQuery({
    queryKey: ['outlet-approvals', entityId, approverId, approverRoleId, status],
    queryFn: () => outletsApi.getApprovals(entityId, approverId, approverRoleId, status),
    enabled: !!entityId,
  });
};

export const useOutlets = (params?: UseOutletsParams) => {
  const queryClient = useQueryClient();

  // Debug logging
  console.log('useOutlets - params:', params);
  console.log('useOutlets - outletType:', params?.outletType);

  const outlets = useQuery<OutletsResponse>({
    queryKey: ['outlets', params],
    queryFn: () => outletsApi.getAll(params),
    enabled: params?.enabled !== false,
  });

  const getOutlet = (outletId: string) => {
    return useQuery<{ data: Outlet }>({
      queryKey: ['outlet', outletId],
      queryFn: () => outletsApi.getById(outletId),
      enabled: !!outletId,
    });
  };

  const createOutlet = useMutation({
    mutationFn: ({ data, params }: { data: Partial<Outlet>; params?: { createNew?: boolean } }) =>
      outletsApi.create(data, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    },
  });

  const updateOutlet = useMutation({
    mutationFn: ({
      outletId,
      data,
    }: {
      outletId: string;
      data: Partial<Outlet>;
    }) => outletsApi.update(outletId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      queryClient.invalidateQueries({ queryKey: ['outlet'] });
    },
  });

  const deleteOutlet = useMutation({
    mutationFn: outletsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    },
  });

  const updateDocumentStatus = useMutation({
    mutationFn: ({
      outletId,
      documentType,
      verificationStatus,
    }: {
      outletId: string;
      documentType: string;
      verificationStatus: string;
    }) =>
      outletsApi.updateDocumentStatus(
        outletId,
        documentType,
        verificationStatus
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      queryClient.invalidateQueries({ queryKey: ['outlet'] });
    },
  });

  const updateVerificationDocument = useMutation({
    mutationFn: ({
      outletId,
      verificationDocumentId,
      data,
    }: {
      outletId: string;
      verificationDocumentId: string;
      data: {
        documentType: string;
        value: string;
        verificationStatus?: string;
        documentImages?: Array<{ s3Filename: string }>;
      };
    }) => outletsApi.updateVerificationDocument(outletId, verificationDocumentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      queryClient.invalidateQueries({ queryKey: ['outlet'] });
    },
  });

  const updateApproverStatus = useMutation({
    mutationFn: ({
      outletId,
      approvedBy,
      roleId,
      status,
      reason,
    }: {
      outletId: string;
      approvedBy: string;
      roleId: string;
      status: 'approved' | 'suspended' | 'rejected';
      reason: string;
    }) =>
      outletsApi.updateApproverStatus({
        outletId,
        approvedBy,
        roleId,
        status,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      queryClient.invalidateQueries({ queryKey: ['outlet'] });
    },
  });

  const bulkUpload = useMutation({
    mutationFn: outletsApi.bulkUpload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    },
  });

  const downloadErrorFile = useMutation({
    mutationFn: outletsApi.downloadErrorFile,
    onSuccess: (blob: Blob, errorFileId: string) => {
      console.log('Download error file success:', { blob, errorFileId, blobSize: blob.size, blobType: blob.type }); 
      
      if (blob.size === 0) {
        console.warn('Downloaded file is empty');
        return;
      }
      
      try {
        // Create download with custom filename
        const currentDate = new Date();
        const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        const timeString = currentDate.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
        const fileName = `Outlet_Bulk_Upload_Errors_${dateString}_${timeString}.xlsx`;
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('Error file download completed successfully');
        console.log('Downloaded file name:', fileName);
      } catch (downloadError) {
        console.error('Error during file download:', downloadError);
      }
    },
    onError: (error) => {
      console.error('Download error file failed:', error); 
    },
  });

  const bulkUpdateBeatDetails = useMutation({
    mutationFn: outletsApi.bulkUpdateBeatDetails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
    },
  });

  const getDuplicateOutlets = (outletId: string) => {
    return useQuery({
      queryKey: ['outlet-duplicates', outletId],
      queryFn: () => outletsApi.getDuplicates(outletId),
      enabled: !!outletId,
    });
  };

  return {
    outlets,
    getOutlet,
    createOutlet,
    updateOutlet,
    deleteOutlet,
    updateDocumentStatus,
    updateVerificationDocument,
    updateApproverStatus,
    bulkUpload,
    downloadErrorFile,
    bulkUpdateBeatDetails,
    getDuplicateOutlets,
  };
};
