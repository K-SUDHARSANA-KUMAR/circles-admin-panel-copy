'use client';

import { createColumns } from '@/components/data-tables/products/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import { useProducts } from '@/features/dashboard/products/hooks/useProducts';
import { History, Pencil, PlusIcon, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { RequirePermission } from '@/components/auth/require-permission';
import { useOptimizedPermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { Action } from '@/components/data-tables/util/types';
import { PaginationState } from '@tanstack/react-table';
import { SearchInput } from '@/components/ui/search-input';
import ProductTabs from '@/components/tabs/products/product-tabs';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { toast } from 'sonner';
import { ProductStatus } from '@/constants/enums/product.enums';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ProductListPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.PRODUCTS}>
      <ProductListContent />
    </RequirePermission>
  );
};

const ProductListContent = () => {
  const permission = useOptimizedPermissionChecker();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const { recordMaps } = useAppSelector((state) => state.masterRecords);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    searchQuery,
    selectedBrandIds,
    selectedCategoryIds,
    selectedSubcategoryIds,
    selectedStatus,
  ]);

  useEffect(() => {
    setSelectedSubcategoryIds([]);
  }, [selectedCategoryIds]);

  const { products, syncSapProducts } = useProducts({
    ...(selectedBrandIds.length > 0 && { brandId: selectedBrandIds }),
    ...(selectedCategoryIds.length > 0 && { categoryId: selectedCategoryIds }),
    ...(selectedSubcategoryIds.length > 0 && { subcategoryId: selectedSubcategoryIds }),
    ...(selectedStatus && { status: selectedStatus }),
    ...(searchQuery && { search: searchQuery }),
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
  });

  const handleAddNew = () => {
    router.push(NavKeys.ProductCreation);
  };

  const handleEdit = (product: any) => {
    router.push(
      `${NavKeys.ProductCreation}?mode=edit&productId=${product.productId}`
    );
  };

  const handleView = (product: any) => {
    router.push(
      `${NavKeys.ProductCreation}?mode=view&productId=${product.productId}`
    );
  };

  const handleViewLogs = (product: any) => {
    router.push(`/dashboard/products/logs?productId=${product.productId}`);
  };

  const handleRefresh = () => {
    products.refetch();
  };

  const handleSyncSap = async () => {
    try {
      await syncSapProducts.mutateAsync();
      toast.success('SAP products synced successfully!');
    } catch (error: any) {
      console.error('Sync SAP failed:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to sync SAP products';
      toast.error(`Sync failed: ${errorMessage}`);
    }
  };

  const getActionsForPermissions = useCallback(
    (product: any): Action[] => {
      const actions: Action[] = [];
      if (permission.has(PERMISSIONS.PRODUCTS, MENU_RIGHTS.VIEW)) {
        actions.push({
          title: 'View ',
          icon: <Pencil />,
          handleAction: () => handleView(product),
        });
        actions.push({
          title: 'Edit',
          icon: <Pencil />,
          handleAction: () => handleEdit(product),
        });
      }
      if (permission.has(PERMISSIONS.PRODUCTS, MENU_RIGHTS.LOG)) {
        actions.push({
          title: 'Logs',
          icon: <History />,
          handleAction: () => handleViewLogs(product),
        });
      }
      return actions;
    },
    [permission]
  );

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };


  return (
    <section className="w-full space-y-6">
      <PageHeader title="Products" />

      <div className="w-full space-y-4 rounded-lg bg-white p-4">
        <ProductTabs />
        <div className="flex flex-col">
          <div className="flex flex-col justify-between gap-10 pb-4 md:flex-row">
            <div className="relative">
              <SearchInput
                placeholder="Search Product name"
                className="md:w-full"
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>

            <div className="flex gap-2">
              {permission.has(PERMISSIONS.PRODUCTS, MENU_RIGHTS.SYNC_SAP) && (
                <Button
                  variant="secondary"
                  onClick={handleSyncSap}
                  disabled={syncSapProducts.isPending}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${syncSapProducts.isPending ? 'animate-spin' : ''}`}
                  />
                  Sync SAP
                </Button>
              )}
              {permission.has(PERMISSIONS.PRODUCTS, MENU_RIGHTS.CREATE) && (
                <Button onClick={handleAddNew}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              )}
            </div>
          </div>
          {/* Location Filters */}
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-2">
              <MasterRecordCheckboxMultiSelect
                masterName="brand"
                value={selectedBrandIds}
                onChange={(values) => setSelectedBrandIds(values)}
                placeholder="Brand"
                className="w-full"
                displayName="brand"
              />
            </div>
            <div className="space-y-2">
              <MasterRecordCheckboxMultiSelect
                masterName="category"
                value={selectedCategoryIds}
                onChange={(values) => setSelectedCategoryIds(values)}
                placeholder="Category"
                className="w-full"
                displayName="category"
              />
            </div>
            <div className="space-y-2">
              <MasterRecordCheckboxMultiSelect
                masterName="subcategory"
                value={selectedSubcategoryIds}
                onChange={(values) => setSelectedSubcategoryIds(values)}
                placeholder="Subcategory"
                className="w-full"
                displayName="subcategory"
                filters={
                  selectedCategoryIds.length > 0
                    ? { categoryId: selectedCategoryIds }
                    : undefined
                }
              />
            </div>
            <div className="space-y-2">
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value={ProductStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={ProductStatus.INACTIVE}>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DataTable
          columns={createColumns(
            {
              brandMap: Object.fromEntries(
                Object.entries(recordMaps.brand || {}).map(
                  ([key, record]) => [
                    key,
                    { brandName: String((record as any).brandName || '') },
                  ]
                )
              ),
              categoryMap: Object.fromEntries(
                Object.entries(recordMaps.category || {}).map(
                  ([key, record]) => [
                    key,
                    {
                      categoryName: String(
                        (record as any).categoryName || ''
                      ),
                    },
                  ]
                )
              ),
              subcategoryMap: Object.fromEntries(
                Object.entries(recordMaps.subcategory || {}).map(
                  ([key, record]) => [
                    key,
                    {
                      subcategoryName: String(
                        (record as any).subcategoryName ||
                          (record as any).subcategoryname ||
                          ''
                      ),
                    },
                  ]
                )
              ),
            },
            getActionsForPermissions,
            pagination.pageIndex,
            pagination.pageSize
          )}
          data={products.data?.data?.items || []}
          pageCount={products.data?.data?.totalPages || 0}
          totalItems={products.data?.data?.totalItems || 0}
          onPaginationChange={handlePaginationChange}
          manualPagination={true}
          initialPagination={pagination}
          isLoading={products.isLoading}
          loadingText="Loading products..."
          tableId="products-table"
        />
      </div>
    </section>
  );
};

export default ProductListPage;
