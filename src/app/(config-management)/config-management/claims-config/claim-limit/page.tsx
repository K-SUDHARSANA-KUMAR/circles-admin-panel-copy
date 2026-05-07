'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { createClaimLimitColumns, ClaimLimit } from '@/components/data-tables/claims/claim-limit-columns';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { RequirePermission } from '@/components/auth/require-permission';
import ClaimsConfigTab from '@/components/tabs/claims/claims-config-tabs';
import EmptyState from '@/components/ui/empty-state';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const ClaimLimitPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.CLAIM_CONFIG}>
      <ClaimLimitContent />
    </RequirePermission>
  );
};

const ClaimLimitContent = () => {
  const configPermission = usePermissionChecker(PERMISSIONS.CLAIM_CONFIG);
  const hasCreatePermission = configPermission.has(MENU_RIGHTS.CREATE);
  const router = useRouter();

  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedClaimType, setSelectedClaimType] = useState<string>('');
  const [selectedSubType, setSelectedSubType] = useState<string>('');

  // Mock data for claim types and sub types
  const claimTypes = ['Travel', 'Food', 'Lodging', 'Others'];
  const subTypes = ['Local Travel', 'Outstation Travel', 'Daily Allowance', 'Accommodation'];

  // Mock data for claim limits
  const mockClaimLimits: ClaimLimit[] = [
    {
      id: '1',
      band: 'Band A',
      claimType: 'Travel',
      subType: 'Local Travel',
      limit: 5000,
      claimLimit: 4500,
      aiScore: 85,
      billRequired: true,
    },
    {
      id: '2',
      band: 'Band B',
      claimType: 'Food',
      subType: 'Daily Allowance',
      limit: 2000,
      claimLimit: 1800,
      aiScore: 92,
      billRequired: false,
    },
    {
      id: '3',
      band: 'Band A',
      claimType: 'Lodging',
      subType: 'Accommodation',
      limit: 8000,
      claimLimit: 7500,
      aiScore: 78,
      billRequired: true,
    },
  ];

  const [claimLimits, setClaimLimits] = useState<ClaimLimit[]>(mockClaimLimits);

  const handleEdit = (item: ClaimLimit) => {
    console.log('Edit claim limit:', item);
    // Implement edit functionality
  };

  const handleDelete = (item: ClaimLimit) => {
    console.log('Delete claim limit:', item);
    // Implement delete functionality
    setClaimLimits(prev => prev.filter(limit => limit.id !== item.id));
  };

  const handleAddNew = () => {
    router.push(NavKeys.ClaimConfigLimitCreation);
  };

  const columns = createClaimLimitColumns(handleEdit, handleDelete);

  // Filter data based on selected filters
  const filteredData = claimLimits.filter(item => {
    return (
      (!selectedBrand || selectedBrand === 'all' || item.band === selectedBrand) &&
      (!selectedClaimType || selectedClaimType === 'all' || item.claimType === selectedClaimType) &&
      (!selectedSubType || selectedSubType === 'all' || item.subType === selectedSubType)
    );
  });

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Claims Configuration" />
      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <ClaimsConfigTab />
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="flex flex-col gap-2 md:flex-row">
            <MasterRecordDropdown
              masterName="band"
              value={selectedBrand}
              onChange={setSelectedBrand}
              placeholder="Select Band"
            />
            <Select value={selectedClaimType} onValueChange={setSelectedClaimType}>
              <SelectTrigger>
                <SelectValue placeholder="Select Claim Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {claimTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSubType} onValueChange={setSelectedSubType}>
              <SelectTrigger>
                <SelectValue placeholder="Select Sub Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub Types</SelectItem>
                {subTypes.map((subType) => (
                  <SelectItem key={subType} value={subType}>
                    {subType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasCreatePermission && (
            <div className="flex items-center gap-2">
              <Button onClick={handleAddNew}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add New
              </Button>
            </div>
          )}
        </div>
        {filteredData.length > 0 ? (
          <DataTable columns={columns} data={filteredData} tableId="claim-limit-table" />
        ) : (
          <div className="flex h-64 items-center justify-center">
            <EmptyState text="No claim limits found. Start by adding your first claim limit configuration." />
          </div>
        )}
      </div>
    </section>
  );
};

export default ClaimLimitPage;
