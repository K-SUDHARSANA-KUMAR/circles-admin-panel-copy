'use client';

import { createColumns } from '@/components/data-tables/master-schema/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import NavKeys from '@/constants/navkeys';
import { useMasterSchema } from '@/features/master-managment/hooks/useMasterSchema';
import { Pencil, PlusIcon, History } from 'lucide-react';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import EmptyState from '@/components/ui/empty-state';
import { RequirePermission } from '@/components/auth/require-permission';
import { useOptimizedPermissionChecker, usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { SearchInput } from '@/components/ui/search-input';
import PageHeader from '@/components/shared/page-header';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const MasterSchemaPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.MASTER_SCHEMA}>
      <MasterSchemaContent />
    </RequirePermission>
  );
};

const MasterSchemaContent = () => {
  const permission = useOptimizedPermissionChecker();
  const hasCreatePermission = permission.has(PERMISSIONS.MASTER_SCHEMA, MENU_RIGHTS.CREATE);
  const router = useRouter();
  const searchParams = useSearchParams();

  const groupId = searchParams.get('groupId');
  const { schemasByGroup } = useMasterSchema(
    undefined,
    undefined,
    groupId || undefined
  );
  const currentSchemasQuery = schemasByGroup;

  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch('');
  }, [groupId]);

  const enrichedData =
    currentSchemasQuery.data?.data
      ?.filter((schema: any) =>
        search
          ? schema.name?.toLowerCase().includes(search.toLowerCase())
          : true
      )
      .map((schema: any) => ({
        ...schema,
        onEdit: () => handleEdit(schema),
      })) || [];

  function handleEdit(schema: any) {
    const editParams = new URLSearchParams();
    editParams.set('edit', schema.name);
    if (groupId) {
      editParams.set('groupId', groupId);
    }
    const path = `${NavKeys.MasterSchemaCreation}?${editParams.toString()}`;
    router.push(path);
  }

  function handleAddNew() {
    const creationUrl = groupId
      ? `${NavKeys.MasterSchemaCreation}?groupId=${groupId}`
      : NavKeys.MasterSchemaCreation;
    router.push(creationUrl);
  }

  const handleViewLogs = (schema: { name: string }) => {
    const logsUrl = groupId
      ? `${NavKeys.MasterSchemaLogs}?schemaName=${schema.name}&groupId=${groupId}`
      : `${NavKeys.MasterSchemaLogs}?schemaName=${schema.name}`;
    router.push(logsUrl);
  };

  const getActionsForPermissions = useCallback(
    (schema: any): Action[] => {
      const actions: Action[] = [];
      if (permission.has(PERMISSIONS.MASTER_SCHEMA, MENU_RIGHTS.EDIT)) {
        actions.push({
          title: 'Edit',
          handleAction: () => handleEdit(schema),
        });
      }
      if (permission.has(PERMISSIONS.MASTER_SCHEMA, MENU_RIGHTS.LOG)) {
        actions.push({
          title: 'Logs',
          handleAction: () => handleViewLogs(schema),
        });
      }
      return actions;
    },
    [permission]
  );

  if (!groupId) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title="Master Schema" />

        <div className="w-full rounded-lg bg-card p-4">
          <div className="flex h-64 items-center justify-center">
            <EmptyState
              text="Please select a group from the sidebar to view schemas."
              className="text-center"
            />
          </div>
        </div>
      </section>
    );
  }

  if (currentSchemasQuery.error) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title="Master Schema" />

        <div className="w-full rounded-lg bg-card p-4">
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading master schema. Please try again." />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Master Schema" />

      <div className="w-full rounded-lg bg-card p-4">
        <div className="flex justify-between pb-4">
          <SearchInput
            placeholder="Search schema name"
            className="md:w-full"
            value={search}
            onChange={setSearch}
          />
          {hasCreatePermission && (
            <Button
              disabled={currentSchemasQuery.isLoading}
              onClick={handleAddNew}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add New Schema
            </Button>
          )}
        </div>
        {currentSchemasQuery.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading master schema..." />
          </div>
        ) : (
          <DataTable
            columns={createColumns(getActionsForPermissions)}
            data={enrichedData}
            tableId="master-schema-table"
          />
        )}
        {currentSchemasQuery.error && (
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading master schema. Please try again." />
          </div>
        )}
      </div>
    </section>
  );
};

export default MasterSchemaPage;
