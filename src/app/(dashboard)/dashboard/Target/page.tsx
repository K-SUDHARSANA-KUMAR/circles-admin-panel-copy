"use client";

import PageHeader from "@/components/shared/page-header";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { MasterRecordDropdown } from "@/components/shared/master-record-dropdown-filter";
import { WarehouseDropdown } from "@/components/shared/warehouse-dropdown";
import { DataTable } from "@/components/ui/data-table";
import { createTargetColumns, TargetRow } from "@/components/data-tables/target/columns";
import { useRouter } from "next/navigation";
import NavKeys from "@/constants/navkeys";
import { useTargets } from "@/features/dashboard/targets/hooks/useTargets";
import { PaginationState } from "@tanstack/react-table";

export default function TargetPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [brandId, setBrandId] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);


  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Fetch targets from API with pagination
  const { targets } = useTargets(
    pagination.pageIndex * pagination.pageSize,
    pagination.pageSize
  );
  const isLoading = targets?.isLoading || false;

  // Map API data to TargetRow shape expected by the table
  const rows: TargetRow[] = useMemo(() => {
    if (!targets?.data?.items || !Array.isArray(targets.data.items)) return [];
    return targets.data.items.map((t: any, idx: number) => {
      // Show actual targetName from database, leave empty if field is empty
      const targetName = t?.targetName || '';
      
      // Robust extraction for actuals from possible shapes
      const actualAmount = Number(
        (t?.actual && (t.actual.amount ?? t.actual.valueAmount)) ??
        t?.actualAmount ??
        (t?.actuals && (t.actuals.amount ?? t.actuals.valueAmount)) ??
        0
      );
      const actualKgs = Number(
        (t?.actual && (t.actual.kgs ?? t.actual.kg ?? t.actual.weight)) ??
        t?.actualKgs ??
        (t?.actuals && (t.actuals.kgs ?? t.actuals.kg ?? t.actuals.weight)) ??
        0
      );
      
      return {
        id: t?.targetId || t?._id || t?.id || String(idx + 1),
        name: targetName,
        targetAmount: Number(t?.target?.amount ?? 0),
        targetKgs: Number(t?.target?.kgs ?? 0),
        actualAmount,
        actualKgs,
        status: t?.status || 'draft',
      } as TargetRow;
    });
  }, [targets?.data?.items]);

  // Handle pagination changes
  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  const handleNewTarget = () => {
    router.push(NavKeys.TargetCreation);
  };

  const handleEdit = (row: TargetRow) => {
    // Navigate to edit page using query parameters
    router.push(`/dashboard/Target/edit?id=${row.id}`);
  };

  const handleView = (row: TargetRow) => {
    router.push(`/dashboard/Target/view?id=${row.id}`);
  };

  const getActionsForRow = (row: TargetRow) => {
    const actions = [
      {
        title: "Edit",
        icon: <span className="text-secondary"></span>,
        handleAction: () => handleEdit(row),
      },
    ];

    // Only show View action if status is active
    if (row.status === 'active') {
      actions.push({
        title: "View",
        icon: <span className="text-secondary"></span>,
        handleAction: () => handleView(row),
      });
    }

    return actions;
  };

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Target" />

      <div className="w-full space-y-4 rounded-lg bg-card p-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div className="relative">
            <SearchInput
              placeholder="Search target"
              className="md:w-full"
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleNewTarget}>New Target</Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <MasterRecordDropdown
            masterName="brand"
            value={brandId}
            onChange={setBrandId}
            placeholder="Brand"
            className="w-full md:w-[calc(50%-0.5rem)]"
          />
          <MasterRecordDropdown
            masterName="category"
            value={categoryId}
            onChange={(val) => {
              setCategoryId(val);
              setSubcategoryId(undefined);
            }}
            placeholder="Category"
            className="w-full md:w-[calc(50%-0.5rem)]"
          />
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <WarehouseDropdown
            value={warehouseId}
            onChange={setWarehouseId}
            placeholder="Warehouse"
            className="w-full md:w-[calc(50%-0.5rem)]"
          />
          <MasterRecordDropdown
            masterName="subcategory"
            value={subcategoryId}
            onChange={setSubcategoryId}
            placeholder="Sub Category"
            className="w-full md:w-[calc(50%-0.5rem)]"
            filters={categoryId ? { categoryId } : undefined}
          />
        </div>

        <DataTable
          columns={createTargetColumns(getActionsForRow, pagination.pageIndex, pagination.pageSize)}
          data={rows}
          pageCount={targets?.data?.totalPages || 0}
          totalItems={targets?.data?.totalItems || 0}
          onPaginationChange={handlePaginationChange}
          manualPagination={true}
          initialPagination={pagination}
          tableId="targets-table"
          isLoading={isLoading}
          loadingText="Loading targets..."
        />
      </div>
    </section>
  );
}