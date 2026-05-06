import { Outlet, OutletsResponse, UseOutletsParams } from '../types/outlet.types';
import { apiEndPoint } from '@/features/apiEndPoint';
import { approvalsApi } from '@/features/common/api/approvals';
import customAxios from '@/lib/axios';

const { OUTLETS_ENDPOINT, CONFIG_BASE_URL } = apiEndPoint;

export const outletsApi = {
  getAll: async (params?: UseOutletsParams): Promise<OutletsResponse> => {
    const response = await customAxios.get(OUTLETS_ENDPOINT, { params });
    return response.data;
  },

  getById: async (outletId: string): Promise<{ data: Outlet }> => {
    const response = await customAxios.get(`${OUTLETS_ENDPOINT}/${outletId}`);
    return response.data;
  },

  create: async (data: Partial<Outlet>, params?: { createNew?: boolean }): Promise<{ data: Outlet }> => {
    const response = await customAxios.post(OUTLETS_ENDPOINT, data, { params });
    return response.data;
  },

  update: async (
    outletId: string,
    data: Partial<Outlet>
  ): Promise<{ data: Outlet }> => {
    const response = await customAxios.patch(`${OUTLETS_ENDPOINT}/${outletId}`, data);
    return response.data;
  },

  delete: async (outletId: string): Promise<{ message: string }> => {
    const response = await customAxios.delete(`${OUTLETS_ENDPOINT}/${outletId}`);
    return response.data;
  },

  updateDocumentStatus: async (
    outletId: string,
    documentType: string,
    verificationStatus: string
  ): Promise<{ message: string }> => {
    const response = await customAxios.patch(
      `${OUTLETS_ENDPOINT}/${outletId}/documents/status`,
      {
        documentType,
        verificationStatus,
      }
    );
    return response.data;
  },

  updateVerificationDocument: async (
    outletId: string,
    verificationDocumentId: string,
    data: {
      documentType: string;
      value: string;
      verificationStatus?: string;
      documentImages?: Array<{ s3Filename: string }>;
    }
  ): Promise<{ message: string }> => {
    const response = await customAxios.patch(
      `${OUTLETS_ENDPOINT}/${outletId}/verification-documents/${verificationDocumentId}`,
      data
    );
    return response.data;
  },

  updateApproverStatus: async ({
    outletId,
    status,
    reason,
    approvedBy,
    roleId,
  }: {
    outletId: string;
    status: 'approved' | 'suspended' | 'rejected';
    reason: string;
    approvedBy: string;
    roleId: string;
  }) => {
    // Use the common approval API for consistency
    return approvalsApi.processApproval({
      entityId: outletId,
      entityType: 'outlets',
      approvalStatus: status as 'approved' | 'rejected',
      remarks: reason,
      approverId: approvedBy,
      roleId,
    });
  },
  getApprovals: async (
    entityId: string,
    approverId?: string,
    approverRoleId?: string,
    status?: string
  ) => {
    // Use the common approval API for consistency
    return approvalsApi.getApprovals({
      entityId,
      entityType: 'outlets',
      approverId,
      approverRoleId,
      status,
    });
  },

  bulkUpload: async (file: File): Promise<{
     message: string;
     successCount?: number;
     errorCount?: number;
     errorFileId?: string;
     errorFileBlob?: ArrayBuffer;
    }> => {
    const formData = new FormData();
    formData.append('outletFile', file);

    const response = await customAxios.post(`${OUTLETS_ENDPOINT}/bulk-upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'arraybuffer', // This allows receiving binary data
    });
    
    // Check if response is JSON or binary file
    const responseData = response.data;
    const responseText = new TextDecoder().decode(responseData);
    
    // Try to parse as JSON first
    try {
      const result = JSON.parse(responseText);
      return result;
    } catch (parseError) {
      // If parsing fails, it might be a binary file
      console.log('Response is not JSON, might be binary file');
      
      // Check if it's an Excel file (starts with "PK")
      if (responseText.startsWith('PK')) {
        console.log('Response appears to be an Excel file');
        return {
          message: 'Bulk upload completed with errors',
          errorCount: 1,
          errorFileBlob: responseData
        };
      }
      
      // If neither JSON nor Excel, return error
      throw new Error('Unexpected response format from server');
    }
  },

  downloadErrorFile: async (errorFileId: string): Promise<Blob> => {
    console.log('=== DOWNLOAD ERROR FILE API ===');
    console.log('Error file ID:', errorFileId);
    console.log('Endpoint:', `${OUTLETS_ENDPOINT}/bulk-upload/error-file`);
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('accessToken');
    console.log('Token found:', !!token);
    
    const requestBody = {
      errorFileId: errorFileId
    };
    console.log('Request body:', requestBody);
    
    try {
      const response = await customAxios.post(`${OUTLETS_ENDPOINT}/bulk-upload/error-file`, requestBody, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      console.log('Download API success');
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Blob size:', response.data?.size);
      console.log('Blob type:', response.data?.type);
      console.log('========================');
      
      return response.data;
    } catch (error: any) {
      console.error('Download API error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      console.log('========================');
      throw error;
    }
  },

  bulkUpdateBeatDetails: async (updates: Array<{
    outletId: string;
    beatDetails: {
      beatId: string;
      beatName: string;
      beatPriority: number;
    };
  }>): Promise<{ message: string; successCount: number; errorCount: number }> => {
    const response = await customAxios.patch(`${OUTLETS_ENDPOINT}/bulk/beat-details`, {
      updates,
    });
    return response.data;
  },

  getDuplicates: async (outletId: string): Promise<{
    data: Array<{
      reasons: string[];
      outletId: string;
      outletCode?: string;
      outletName: string;
      phoneNumber: string;
      email?: string;
      ownerName: string;
    }>;
  }> => {
    const response = await customAxios.get(`${OUTLETS_ENDPOINT}/duplicates/${outletId}`);
    return response.data;
  },
};
