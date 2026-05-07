'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { DataTable } from '@/components/ui/data-table';
import PageHeader from '@/components/shared/page-header';
import { useMasterRecordsPage } from './_hooks/useMasterRecordsPage';
import FiltersBar from './_components/filters-bar';

const MasterRecordsPage = () => {
  return (
    <RequirePermission module="master-records">
      <MasterRecordsContent />
    </RequirePermission>
  );
};

const MasterRecordsContent = () => {
  const {
    schemaName,
    search,
    setSearch,
    schemaFields,
    pagination,
    handlePaginationChange,
    columns,
    enrichedData,
    paginationData,
    isLoading,
    selectedMasterValues,
    handleMasterRecordChange,
    handleAddNew,
  } = useMasterRecordsPage();

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Master Records" />

      <div className="w-full rounded-lg bg-card p-4">
        <FiltersBar
          schemaName={schemaName}
          fields={schemaFields}
          search={search}
          onSearchChange={setSearch}
          selectedMasterValues={selectedMasterValues}
          onMasterChange={handleMasterRecordChange}
          onAddNew={handleAddNew}
          isBusy={isLoading}
        />

        <DataTable
          columns={columns as any}
          data={enrichedData}
          pageCount={paginationData?.totalPages || 0}
          totalItems={paginationData?.totalItems || 0}
          onPaginationChange={handlePaginationChange}
          manualPagination={true}
          initialPagination={pagination}
          isLoading={isLoading}
          loadingText={`Loading Master Records`}
          tableId="master-records-table"
          isDownload={false}
          isColumnDisplay={false}
        />
      </div>
    </section>
  );
};

export default MasterRecordsPage;
