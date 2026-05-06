'use client';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import EmptyState from '@/components/ui/empty-state';
import { useState, useCallback } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { usePjpConfig } from '@/features/config-management/pjp-config/hooks/usePjpConfig';
import { useGenerateRoutePlan, useTriggerAutoPjp } from '@/features/dashboard/pjp/hooks/usePjp';
import {
  createColumns,
  setActionHandlers,
  PJPConfigTableData,
} from '@/components/data-tables/pjp-config/columns';
import { toast } from 'sonner';
import { WarehouseDropdown } from '@/components/shared/warehouse-dropdown';
import { WarehouseMultiSelectModal } from '@/components/modals/warehouse-multiselect-modal';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const PJPConfigPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.PJP_CONFIG}>
      <PJPConfigContent />
    </RequirePermission>
  );
};

const PJPConfigContent = () => {
  const pjpPermission = usePermissionChecker(PERMISSIONS.PJP_CONFIG);
  const hasCreatePermission = pjpPermission.has(MENU_RIGHTS.CREATE);
  const hasEditPermission = pjpPermission.has(MENU_RIGHTS.EDIT);
  const hasViewPermission = pjpPermission.has(MENU_RIGHTS.VIEW);

  const router = useRouter();
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  
  // Warehouse multiselect modal state
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);

  // API integration
  const {
    data: pjpConfigs,
    isLoading,
    error,
    pagination,
    activatePjpConfig,
    deactivatePjpConfig,
  } = usePjpConfig({
    warehouseId: warehouseFilter || undefined,
  });

  // Route plan generation hook
  const generateRoutePlan = useGenerateRoutePlan();
  const triggerAutoPjp = useTriggerAutoPjp();

  const handleAddNew = () => {
    router.push(NavKeys.PjpConfigCreation);
  };

  const handleCreatePJP = useCallback(() => {
    // Open warehouse multiselect modal
    setIsWarehouseModalOpen(true);
  }, []);

  const handleCreateManualPjpPlan = useCallback(async () => {
    try {
      toast.loading('Triggering auto PJP generation...', { id: 'trigger-auto-pjp' });
      await triggerAutoPjp.mutateAsync();
      toast.success('Auto PJP generation triggered successfully!', { id: 'trigger-auto-pjp' });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.data?.message ||
                          error?.message || 
                          'Failed to trigger auto PJP generation';
      toast.error(errorMessage, { id: 'trigger-auto-pjp' });
    }
  }, [triggerAutoPjp]);

  const handleWarehouseModalConfirm = useCallback(async () => {
    try {
      // Close modal first
      setIsWarehouseModalOpen(false);
      
      const loadingMessage = selectedWarehouseIds.length > 0 
        ? `Generating route plan for ${selectedWarehouseIds.length} selected warehouse(s)...`
        : 'Generating route plan for all warehouses...';
      
      toast.loading(loadingMessage, { id: 'create-pjp' });
      
      // Call API with selected warehouse IDs (or empty object if none selected)
      const payload = selectedWarehouseIds.length > 0 
        ? { warehouseId: selectedWarehouseIds }
        : {};
      
      const result = await generateRoutePlan.mutateAsync(payload);
      
      // Handle the API response structure
      if (result?.data) {
        const { successful, failed, totalWarehouses } = result.data;
        
        if (successful === totalWarehouses && failed === 0) {
          toast.success(`Route plan generated successfully for all ${totalWarehouses} warehouses!`, { id: 'create-pjp' });
        } else if (successful > 0 && failed > 0) {
          toast.success(`Route plan generated for ${successful} out of ${totalWarehouses} warehouses.`, { id: 'create-pjp' });
        } else {
          toast.success('Route plan generation completed. Please check the system for details.', { id: 'create-pjp' });
        }
      } else {
        // Fallback for unexpected response structure
        toast.success('Route plan generation completed!', { id: 'create-pjp' });
      }
      
      // Reset selected warehouses after successful API call
      setSelectedWarehouseIds([]);
    } catch (error: any) {
      // Handle different error structures
      const originalError = error?.response?.data?.message || 
                          error?.response?.data?.data?.message ||
                          error?.message || 
                          'Failed to generate route plan';
      
      // Check if it's a VROOM route plan error and show custom message
      const errorMessage = originalError.includes('Failed to generate VROOM route plan') || 
                          originalError.includes('VROOM')
        ? 'PJP generation failed - check config'
        : originalError;
                          
      toast.error(errorMessage, { id: 'create-pjp' });
    }
  }, [selectedWarehouseIds, generateRoutePlan]);

  const handleWarehouseModalCancel = useCallback(() => {
    // Close modal and reset selection
    setIsWarehouseModalOpen(false);
    setSelectedWarehouseIds([]);
  }, []);

  const handleEdit = useCallback(
    (config: PJPConfigTableData) => {
      router.push(`${NavKeys.PjpConfigCreation}?edit=${config.pjpConfigId}&warehouseId=${encodeURIComponent(config.warehouseId)}`);
    },
    [router]
  );

  const handleView = useCallback(
    (config: PJPConfigTableData) => {
      router.push(`${NavKeys.PjpConfigCreation}?view=${config.pjpConfigId}&warehouseId=${encodeURIComponent(config.warehouseId)}`);
    },
    [router]
  );

  const handleLogs = useCallback(
    (config: PJPConfigTableData) => {
      // Navigate to logs page with the specific PJP config ID
      router.push(`/logs?pjpConfigId=${config.pjpConfigId}`);
    },
    [router]
  );

  const handleActivate = useCallback(
    async (config: PJPConfigTableData) => {
      try {
        await activatePjpConfig.mutateAsync(config.pjpConfigId);
        toast.success('PJP configuration activated successfully');
      } catch (error) {
        toast.error('Failed to activate PJP configuration');
      }
    },
    [activatePjpConfig]
  );

  const handleDeactivate = useCallback(
    async (config: PJPConfigTableData) => {
      try {
        await deactivatePjpConfig.mutateAsync(config.pjpConfigId);
        toast.success('PJP configuration deactivated successfully');
      } catch (error) {
        toast.error('Failed to deactivate PJP configuration');
      }
    },
    [deactivatePjpConfig]
  );


  // Set up action handlers for the data table
  setActionHandlers({
    onView: hasViewPermission ? handleView : undefined,
    onEdit: hasEditPermission ? handleEdit : undefined,
    onLogs: handleLogs,
    onActivate: hasEditPermission ? handleActivate : undefined,
    onDeactivate: hasEditPermission ? handleDeactivate : undefined,
  });

  // Get available actions based on permissions
  const getAvailableActions = () => {
    const actions: string[] = [];
    if (hasViewPermission) actions.push('view');
    if (hasEditPermission) actions.push('edit', 'activate', 'deactivate');
    actions.push('logs'); // Logs is always available
    return actions;
  };

  if (isLoading) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title="PJP Configuration" />

        <div className="w-full rounded-lg bg-white p-4">
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading PJP configurations..." />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title="PJP Configuration" />

        <div className="w-full rounded-lg bg-white p-4">
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading PJP configurations. Please try again." />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <PageHeader title="PJP Configuration" />

      <div className="w-full space-y-4 rounded-lg bg-white p-4">
        <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full md:w-auto md:min-w-[350px]">
            <WarehouseDropdown
              value={warehouseFilter}
              onChange={(value) => setWarehouseFilter(value || '')}
              placeholder="Filter by Warehouse"
              className="w-full md:w-[350px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
            {/* Create PJP Button - Testing Purpose */}
            <Button 
              type="button" 
              variant="outline" 
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
              title="test"
              onClick={handleCreatePJP}
            >
              <Info className="mr-2 h-4 w-4" />
              Create PJP
            </Button>
            <p className="text-xs text-gray-500 italic hidden lg:block whitespace-nowrap">
              Testing only
            </p>
            
            {/* Create Manual PJP Plan Button */}
            <Button 
              type="button"
              className="whitespace-nowrap"
              onClick={handleCreateManualPjpPlan}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Manual PJP 
            </Button>
            
            {hasCreatePermission && (
              <Button onClick={handleAddNew} className="whitespace-nowrap">
                <PlusIcon className="mr-2 h-4 w-4" />
                Create PJP Config
              </Button>
            )}
          </div>
        </div>

        {/* Data Table */}
        {pjpConfigs.length > 0 ? (
          <DataTable
            columns={createColumns(getAvailableActions())}
            data={(pjpConfigs as any[]).map((item) => ({
              ...(item as any),
              warehouseId: (item as any).warehouseId,
              warehouseName: (item as any).warehouseName || 'N/A',
            })) as unknown as PJPConfigTableData[]}
            tableId="pjp-config-table"
          />
        ) : (
          <div className="flex h-64 items-center justify-center">
            <EmptyState text="No PJP configurations found. Start by creating your first configuration." />
          </div>
        )}

      </div>

      {/* Warehouse Multiselect Modal */}
      <WarehouseMultiSelectModal
        open={isWarehouseModalOpen}
        selectedWarehouseIds={selectedWarehouseIds}
        onChange={setSelectedWarehouseIds}
        onConfirm={handleWarehouseModalConfirm}
        onCancel={handleWarehouseModalCancel}
      />
    </section>
  );
};

export default PJPConfigPage;
