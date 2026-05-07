'use client';

import { createColumns } from '@/components/data-tables/master-groups/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { History, Pencil, PlusIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useMasterGroups } from '@/features/master-managment/hooks/useMasterGroups';
import { GroupModal } from '@/components/modals/master-groups-modal';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { RequirePermission } from '@/components/auth/require-permission';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/page-header';
import { useRouter } from 'next/navigation';

const MasterGroupsPage = () => {
  return (
    <RequirePermission module="master-groups">
      <MasterGroupsContent />
    </RequirePermission>
  );
};

const MasterGroupsContent = () => {
  const router = useRouter();
  const permission = usePermissionChecker('master-groups');
  const hasCreatePermission = permission.has('create');
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<null | {
    groupId: string;
    groupName: string;
    displayName: string;
  }>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const { groups, createGroup, updateGroup } = useMasterGroups();

  const handleSubmit = (data: { groupName: string; displayName: string }) => {
    if (mode === 'create') {
      createGroup.mutate(data, {
        onSuccess: () => setOpen(false),
      });
    } else if (mode === 'edit' && selectedGroup) {
      updateGroup.mutate(
        { groupId: selectedGroup.groupId, data },
        {
          onSuccess: () => {
            setOpen(false);
            setSelectedGroup(null);
          },
        }
      );
    }
  };

  const handleEdit = (group: {
    groupId: string;
    groupName: string;
    displayName: string;
  }) => {
    setSelectedGroup(group);
    setMode('edit');
    setOpen(true);
  };

  const handleViewLogs = (group: { groupId: string }) => {
    router.push(`/master-management/master-groups/logs?groupId=${group.groupId}`);
  };

  const handleAddNew = () => {
    setMode('create');
    setSelectedGroup(null);
    setOpen(true);
  };

  const getActionsForPermissions = useCallback(
    (group: any): Action[] => {
      const actions: Action[] = [];
      if (permission.has('edit')) {
        actions.push({
          title: 'View & Edit',
          icon: <Pencil />,
          handleAction: () => handleEdit(group),
        });
      }
      if (permission.has('log')) {
        actions.push({
          title: 'Logs',
          icon: <History />,
          handleAction: () => handleViewLogs(group)
        });
      }
      return actions;
    },
    [permission]
  );

  if (groups.error) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title="Master Groups" />

        <div className="w-full rounded-lg bg-card p-4">
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading master groups. Please try again." />
          </div>
        </div>
      </section>
    );
  }

  const enrichedData =
    groups.data?.data.map((group: any) => ({
      ...group,
      onEdit: handleEdit,
      onViewLogs: handleViewLogs,
    })) || [];

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Master Groups" />

      <div className="w-full rounded-lg bg-card p-4">
        <div className="flex justify-end pb-4">
          <Button disabled={groups.isLoading} onClick={handleAddNew}>
            <PlusIcon />
            Add New Group
          </Button>
        </div>
        {groups.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading master groups..." />
          </div>
        ) : (
          <DataTable
            columns={createColumns(getActionsForPermissions)}
            data={enrichedData}
            tableId="master-groups-table"
          />
        )}
        <GroupModal
          open={open}
          onOpenChange={setOpen}
          onSubmit={handleSubmit}
          initialData={selectedGroup}
          mode={mode}
          isSubmitting={
            mode === 'create' ? createGroup.isPending : updateGroup.isPending
          }
        />
      </div>
    </section>
  );
};

export default MasterGroupsPage;
