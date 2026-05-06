'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useApprovalHierarchy } from '@/features/config-management/claims-config/approval-hierarchy/hooks/useApprovalHierarchy';
import {
  createClaimHierarchyColumns,
  ClaimHierarchyRow,
} from '@/components/data-tables/claim-hierarchy/columns';
import { DataTable } from '@/components/ui/data-table';
import { RequirePermission } from '@/components/auth/require-permission';
import ClaimsConfigTab from '@/components/tabs/claims/claims-config-tabs';
import { useMemo, useState } from 'react';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { PlusIcon } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { PERMISSIONS } from '@/constants/permissions.constant';

const ApprovalHierarchyPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.CLAIM_APPROVAL}>
      <ApprovalHierarchyTable />
    </RequirePermission>
  );
};

const ApprovalHierarchyTable = () => {
  const router = useRouter();
  const { hierarchies, deleteHierarchy } = useApprovalHierarchy();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedClaimType, setSelectedClaimType] = useState<string>('');
  const recordMaps = useAppSelector((state) => state.masterRecords.recordMaps);
  const tableData: ClaimHierarchyRow[] = useMemo(() => {
    const items = hierarchies?.data?.data?.items || [];
    return items
      .filter(
        (item: any) =>
          (!selectedRole ||
            selectedRole === 'all' ||
            item.roleId === selectedRole) &&
          (!selectedClaimType ||
            selectedClaimType === 'all' ||
            item.claimTypeId === selectedClaimType)
      )
      .map((item: any, idx: number) => {
        // Get role name and claim type name from recordMaps
        let roleName = '';
        let claimTypeName = '';
        if (recordMaps.role && recordMaps.role[item.roleId]) {
          roleName = String(
            recordMaps.role[item.roleId].roleName ||
              recordMaps.role[item.roleId].role_name ||
              ''
          );
        }
        if (recordMaps.claimType && recordMaps.claimType[item.claimTypeId]) {
          claimTypeName = String(
            recordMaps.claimType[item.claimTypeId].claimTypeName ||
              recordMaps.claimType[item.claimTypeId].claim_type_name ||
              recordMaps.claimType[item.claimTypeId].claimName ||
              ''
          );
        }
        return {
          sno: idx + 1,
          claimHierarchyId: item.id || item.claimHierarchyId,
          claimTypeId: item.claimTypeId,
          claimTypeName,
          roleId: item.roleId,
          roleName,
        };
      });
  }, [
    hierarchies?.data?.data?.items,
    selectedRole,
    selectedClaimType,
    recordMaps,
  ]);

  const handleUpdate = (row: ClaimHierarchyRow) => {
    router.push(
      `${NavKeys.ClaimConfigApprovalHierarchyCreation}?id=${row.claimHierarchyId}&mode=edit`
    );
  };

  const handleDelete = (row: ClaimHierarchyRow) => {
    if (confirm('Are you sure you want to delete this approval hierarchy?')) {
      deleteHierarchy.mutate(row.claimHierarchyId);
    }
  };

  const handleViewLogs = (row: ClaimHierarchyRow) => {
    // Implement view logs logic or route
    alert('View logs for: ' + row.claimHierarchyId);
  };

  const columns = createClaimHierarchyColumns(
    handleUpdate,
    handleDelete,
    handleViewLogs
  );

  return (
    <section className="w-full space-y-6">
    
      <PageHeader title="Claims Approval Hierarchy" />

      <div className="w-full space-y-3 rounded-lg bg-white p-4">
        <ClaimsConfigTab />
        <div className="mb-4 flex flex-col items-center justify-between gap-2 md:flex-row">
          <div className="flex gap-2">
            <MasterRecordDropdown
              masterName="role"
              value={selectedRole}
              onChange={setSelectedRole}
              placeholder="Select Role"
            />
            <MasterRecordDropdown
              masterName="claimType"
              value={selectedClaimType}
              onChange={setSelectedClaimType}
              placeholder="Select Claim Type"
            />
          </div>
          <Button
            onClick={() => router.push(NavKeys.ClaimConfigApprovalHierarchyCreation)}
          >
            <PlusIcon className="h-5 w-5" />
            Add New Config
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={tableData}
          tableId="claim-approval-hierarchy-table"
        />
      </div>
    </section>
  );
};

export default ApprovalHierarchyPage;
