import axios from 'axios';

const configServiceUrl = process.env.NEXT_PUBLIC_CONFIG_SERVICE_URL;

export interface ProcessApprovalParams {
  entityId: string;
  entityType: string;
  approvalStatus: 'approved' | 'rejected' | 'changes_required';
  remarks: string;
  approverId: string;
  roleId: string;
}

export interface GetApprovalsParams {
  entityId: string;
  entityType?: string;
  approverId?: string;
  approverRoleId?: string;
  status?: string;
}

export const approvalsApi = {
  /**
   * Process approval/rejection for any entity type
   */
  processApproval: async ({
    entityId,
    entityType,
    approvalStatus,
    remarks,
    approverId,
    roleId,
  }: ProcessApprovalParams): Promise<any> => {
    const response = await axios.patch(
      `${configServiceUrl}/approvals/${entityType}/entity/${entityId}/process`,
      {
        approverId,
        roleId,
        approvalStatus,
        remarks,
      }
    );
    return response.data;
  },

  /**
   * Get approval data for any entity type
   */
  getApprovals: async ({
    entityId,
    entityType,
    approverId,
    approverRoleId,
    status,
  }: GetApprovalsParams): Promise<any> => {
    const params = new URLSearchParams();
    params.append('entityId', entityId);
    if (approverId) params.append('approverId', approverId);
    if (approverRoleId) params.append('approverRoleId', approverRoleId);
    if (status) params.append('status', status);
    
    const response = await axios.get(
      `${configServiceUrl}/approvals/${entityType || 'outlets'}?${params.toString()}`
    );
    return response.data;
  },
};
