'use client';

import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { ArrowLeftIcon, PlusIcon, Settings, MoreVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DataDropdown from '@/components/modals/claim-config/data-dropdown';
import Link from 'next/link';
import NavKeys from '@/constants/navkeys';
import { useApprovalHierarchy } from '@/features/config-management/approval-hierarchy/hooks/useApprovalHierarchy';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import Loading from '@/components/ui/loading';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ClaimHierarchyCardAdd from '@/components/modals/claim-config/claim-hierarchy-card-add';
import { RequirePermission } from '@/components/auth/require-permission';

import { APPROVAL_HIERARCHY_TYPES } from '@/constants/enums/approval-hierarchy.enums';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const HIERARCHY_TYPES = APPROVAL_HIERARCHY_TYPES;

const getContextNameFromType = (type: string | null): string | undefined => {
  switch (type) {
    case 'claim-approval-hierarchy':
      return 'claimApprovals';
    case 'outlet-approval-hierarchy':
      return 'outletApprovals';
    case 'scheme-approval-hierarchy':
      return 'schemeApprovals';
    case 'manual-pjp-approval-hierarchy':
      return 'manualPjpApprovals';
    default:
      return 'claimApprovals';
  }
};

// Map URL parameter to hierarchy type
const mapUrlParamToHierarchyType = (urlParam: string | null): string => {
  switch (urlParam) {
    case 'outletApprovals':
      return 'outlet-approval-hierarchy';
    case 'claimApprovals':
      return 'claim-approval-hierarchy';
    case 'schemeApprovals':
      return 'scheme-approval-hierarchy';
    case 'manualPjpApprovals':
      return 'manual-pjp-approval-hierarchy';
    default:
      return urlParam || 'claim-approval-hierarchy';
  }
};

// Meta field configurations for each hierarchy type
const getMetaFieldsForType = (type: string) => {
  switch (type) {
    case 'claim-approval-hierarchy':
      return [
        { key: 'claimTypeId', label: 'Claim Type', masterName: 'claimType', filters: [] },
        { key: 'roleId', label: 'Role', masterName: 'role', filters: [] },
      ];
    case 'outlet-approval-hierarchy':
      return [
        { key: 'divisionId', label: 'Division', masterName: 'division', filters: [] },
        { key: 'channelId', label: 'Channel', masterName: 'channel', filters: ['divisionId'] },
        { key: 'paymentModeId', label: 'Payment Mode', masterName: 'paymentMode', filters: [] },
      ];
    case 'scheme-approval-hierarchy':
      return [
        { key: 'divisionId', label: 'Division', masterName: 'division', filters: [] },
        { key: 'channelId', label: 'Channel', masterName: 'channel', filters: ['divisionId'] },
      ];
    case 'manual-pjp-approval-hierarchy':
      return [
        { key: 'divisionId', label: 'Division', masterName: 'division', filters: [] },
      ];
    default:
      return [];
  }
};

const ApprovalHierarchyCreationPage = () => {
  const searchParams = useSearchParams();
  const typeFromQuery = searchParams.get('type');
  // Use type parameter directly as module name, fallback to claim-approval-hierarchy
  const permissionModule = typeFromQuery || PERMISSIONS.CLAIM_APPROVAL_HIERARCHY;

  return (
    <RequirePermission module={permissionModule} action={MENU_RIGHTS.CREATE}>
      <ApprovalHierarchyCreationContent />
    </RequirePermission>
  );
};

const ApprovalHierarchyCreationContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hierarchyId = searchParams.get('hierarchyId');
  const mode = searchParams.get('mode');
  const typeFromQuery = searchParams.get('type');


  // Fetch all necessary master data
  const { records: roleRecordsQuery } = useMasterRecords('role', undefined, 1, 1000, true);
  const { records: claimTypeRecordsQuery } = useMasterRecords('claimType', undefined, 1, 1000, true);
  const { records: divisionRecordsQuery } = useMasterRecords('division', undefined, 1, 1000, true);
  // Fetch all channels without filters - we'll filter them locally
  const { records: channelRecordsQuery } = useMasterRecords('channel', undefined, 1, 1000, true);
  const { records: paymentModeRecordsQuery } = useMasterRecords('paymentMode', undefined, 1, 1000, true);

  // Convert fetched data to dropdown format
  const rolesData = useMemo(() => {
    if (roleRecordsQuery?.data && Array.isArray(roleRecordsQuery.data)) {
      return roleRecordsQuery.data.map((role: any) => ({
        id: role.roleId || role.id || '',
        name: role.roleName || role.rolename || '',
        ...role
      }));
    }
    return [];
  }, [roleRecordsQuery?.data]);

  const claimTypesData = useMemo(() => {
    if (claimTypeRecordsQuery?.data && Array.isArray(claimTypeRecordsQuery.data)) {
      return claimTypeRecordsQuery.data.map((claimType: any) => ({
        id: claimType.claimTypeId || claimType.id || '',
        name: claimType.claimTypeName || claimType.claimTypename || '',
        ...claimType
      }));
    }
    return [];
  }, [claimTypeRecordsQuery?.data]);

  const divisionsData = useMemo(() => {
    if (divisionRecordsQuery?.data && Array.isArray(divisionRecordsQuery.data)) {
      return divisionRecordsQuery.data.map((division: any) => ({
        id: division.divisionId || division.id || '',
        name: division.divisionName || division.divisionname || '',
        ...division
      }));
    }
    return [];
  }, [divisionRecordsQuery?.data]);

  const channelsData = useMemo(() => {
    if (channelRecordsQuery?.data && Array.isArray(channelRecordsQuery.data)) {
      return channelRecordsQuery.data.map((channel: any) => ({
        id: channel.channelId || channel.id || '',
        name: channel.channelName || channel.channelname || '',
        divisionId: channel.divisionId || [],
        ...channel
      }));
    }
    return [];
  }, [channelRecordsQuery?.data]);

  const paymentModesData = useMemo(() => {
    if (paymentModeRecordsQuery?.data && Array.isArray(paymentModeRecordsQuery.data)) {
      return paymentModeRecordsQuery.data.map((paymentMode: any) => ({
        id: paymentMode.paymentModeId || paymentMode.id || '',
        name: paymentMode.paymentModeName || paymentMode.paymentmodename || '',
        ...paymentMode
      }));
    }
    return [];
  }, [paymentModeRecordsQuery?.data]);

  const [selectedHierarchyType, setSelectedHierarchyType] = useState<string>(mapUrlParamToHierarchyType(typeFromQuery));
  const [selectedMetaFields, setSelectedMetaFields] = useState<Record<string, string>>({});

  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalLevel, setModalLevel] = useState<string>('');
  const [workflow, setWorkflow] = useState<any[]>([]);
  const [editApprover, setEditApprover] = useState<{ roleId: string; mandatory: boolean } | null>(null);
  const [editApproverIndex, setEditApproverIndex] = useState<number | null>(null);

  // Filter channels based on selected division
  const filteredChannelsData = useMemo(() => {
    const selectedDivisionId = selectedMetaFields['divisionId'];
    console.log('🔍 Channel filtering:', {
      selectedDivisionId,
      allChannels: channelsData.length,
      filteredChannels: selectedDivisionId ? channelsData.filter(channel =>
        Array.isArray(channel.divisionId) ? channel.divisionId.includes(selectedDivisionId) : channel.divisionId === selectedDivisionId
      ).length : 0
    });
    if (!selectedDivisionId) return [];
    return channelsData.filter(channel =>
      Array.isArray(channel.divisionId) ? channel.divisionId.includes(selectedDivisionId) : channel.divisionId === selectedDivisionId
    );
  }, [channelsData, selectedMetaFields]);

  // State for filtered roles from API
  const [filteredRolesFromAPI, setFilteredRolesFromAPI] = useState<{
    data: any[] | null;
    isLoading: boolean;
    error: string | null;
  }>({ data: null, isLoading: false, error: null });

  // Function to fetch roles filtered by division from API
  const fetchRolesByDivisionFromAPI = useCallback(async (divisionId: string) => {
    try {
      setFilteredRolesFromAPI({ data: null, isLoading: true, error: null });

      // Use the existing useMasterRecords hook with filters instead of direct fetch
      // This will use the correct MDM service endpoint
      const { masterRecordsApi } = await import('@/features/master-managment/api/master-records');

      const result = await masterRecordsApi.getAll(
        'role', // masterName
        0, // skip
        1000, // limit
        true, // nonPaginated
        { divisionId }, // filters
        undefined // userId
      );

      if (result && result.items) {
        const roles = result.items;
        setFilteredRolesFromAPI({
          data: roles,
          isLoading: false,
          error: null
        });
      } else {
        setFilteredRolesFromAPI({
          data: [],
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      setFilteredRolesFromAPI({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  // Filter roles based on selected division for outlet approvals
  const filteredRolesData = useMemo(() => {
    if (selectedHierarchyType !== 'outlet-approval-hierarchy') {
      return rolesData; // Return all roles for non-outlet approvals
    }

    const selectedDivisionId = selectedMetaFields['divisionId'];
    console.log(' Role filtering for outlet approvals:', {
      selectedDivisionId,
      allRoles: rolesData.length,
      filteredRoles: selectedDivisionId ? rolesData.filter(role =>
        Array.isArray(role.divisionId) ? role.divisionId.includes(selectedDivisionId) : role.divisionId === selectedDivisionId
      ).length : 0
    });

    if (!selectedDivisionId) return []; // No roles if no division selected for outlet approvals

    // Use local filtering for now
    const filteredRoles = rolesData.filter(role => {
      const roleDivisionId = role.divisionId;
      if (Array.isArray(roleDivisionId)) {
        return roleDivisionId.includes(selectedDivisionId);
      }
      return roleDivisionId === selectedDivisionId;
    });

    return filteredRoles;
  }, [selectedHierarchyType, selectedMetaFields, rolesData]);

  // Create a memoized role map for quick lookups using filtered roles
  const roleMap = useMemo(() => {
    return filteredRolesData.reduce((acc, role) => {
      if (role.id) {
        acc[role.id] = role;
      }
      return acc;
    }, {} as Record<string, any>);
  }, [filteredRolesData]);

  // Get the label for the selected hierarchy type
  const selectedTypeLabel = useMemo(() => {
    const found = HIERARCHY_TYPES.find((t) => t.value === selectedHierarchyType);
    return found ? found.label : '';
  }, [selectedHierarchyType]);
  const { getHierarchyById, createHierarchy, updateHierarchy } = useApprovalHierarchy();
  const editDataQuery = hierarchyId && mode === 'edit' ? getHierarchyById(hierarchyId) : null;

  // Populate fields and workflow in edit mode
  useEffect(() => {
    if (editDataQuery && editDataQuery.data) {
      const data = editDataQuery.data.data;
      // Map the context from API to hierarchy type
      const contextToHierarchyType = {
        'outletApprovals': 'outlet-approval-hierarchy',
        'claimApprovals': 'claim-approval-hierarchy',
        'schemeApprovals': 'scheme-approval-hierarchy',
        'manualPjpApprovals': 'manual-pjp-approval-hierarchy'
      };
      const hierarchyType = contextToHierarchyType[data.context as keyof typeof contextToHierarchyType] || data.context || '';
      setSelectedHierarchyType(hierarchyType);

      // Set meta fields
      const metaFields: Record<string, string> = {};
      if (data.metaTagFields) {
        Object.keys(data.metaTagFields).forEach(key => {
          if (key.endsWith('Id')) {
            metaFields[key] = data.metaTagFields[key];
          }
        });
      }
      setSelectedMetaFields(metaFields);
      setIsEditMode(true);

      if (data && data.approvers) {
        const sorted = [...data.approvers].sort((a, b) => a.level - b.level);
        const levelMap = new Map<number, number>();
        let nextLevel = 1;
        for (const approver of sorted) {
          if (!levelMap.has(approver.level)) {
            levelMap.set(approver.level, nextLevel++);
          }
        }
        setWorkflow(
          sorted.map((approver: any) => ({
            level: `Level ${levelMap.get(approver.level)}`,
            approver: approver.roleName || '',
            approverRoleId: approver.roleId,
            approvalType: approver.mandatory ? 'Required' : 'Optional',
            mandatory: approver.mandatory,
          }))
        );
      }
    }
  }, [editDataQuery?.data]);

  // Group workflow by level
  const groupedWorkflow = useMemo(() => {
    return workflow.reduce((acc: Record<string, typeof workflow>, item: any) => {
      if (!acc[item.level]) {
        acc[item.level] = [];
      }
      acc[item.level].push(item);
      return acc;
    }, {} as Record<string, typeof workflow>);
  }, [workflow]);

  const levels = useMemo(() => Object.keys(groupedWorkflow).sort((a, b) => {
    const levelA = parseInt(a.replace('Level ', ''));
    const levelB = parseInt(b.replace('Level ', ''));
    return levelA - levelB;
  }), [groupedWorkflow]);

  const handleAddNew = useCallback(() => {
    setIsEditMode(true);
    setShowAddModal(true);
    setModalLevel('Level 1');
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditMode(false);
    setShowAddModal(false);
    setModalLevel('');
    const typeParam = selectedHierarchyType ? `?type=${selectedHierarchyType}` : '';
    router.push(`${NavKeys.ApprovalHierarchy}${typeParam}`);
  }, [router, selectedHierarchyType]);

  const handleSave = useCallback(async () => {
    const payload = {
      context: getContextNameFromType(selectedHierarchyType),
      ...selectedMetaFields,
      approvers: workflow.map((item: any) => ({
        level: parseInt(item.level.replace('Level ', '')),
        mandatory: item.mandatory,
        roleId: item.approverRoleId,
      })),
    };

    try {
      if (isEditMode && hierarchyId) {
        await updateHierarchy.mutateAsync({ hierarchyId, data: payload });
        toast.success('Updated successfully');
      } else {
        await createHierarchy.mutateAsync(payload);
        toast.success('Created successfully');
      }
      setIsEditMode(false);
      setShowAddModal(false);
      setModalLevel('');
      const typeParam = selectedHierarchyType ? `?type=${selectedHierarchyType}` : '';
      router.push(`${NavKeys.ApprovalHierarchy}${typeParam}`);
    } catch (error: any) {
      console.error('Failed to save approval hierarchy:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to save approval hierarchy';
      toast.error(errorMessage);
    }
  }, [selectedHierarchyType, selectedMetaFields, workflow, isEditMode, hierarchyId, updateHierarchy, createHierarchy, router]);

  const handleAddApprover = useCallback((level: string, isAddLevel = false) => {
    const currentLevelNum = parseInt(level.replace('Level ', ''));
    setShowAddModal(true);
    setModalLevel(`Level ${currentLevelNum}`);
  }, []);

  const handleEditApprover = useCallback((level: string, approverRoleId: string) => {
    const approver = groupedWorkflow[level].find((a: any) => a.approverRoleId === approverRoleId);
    if (approver) {
      setEditApprover({ roleId: approver.approverRoleId, mandatory: approver.mandatory });
      setEditApproverIndex(
        workflow.findIndex((a) => a.level === level && a.approverRoleId === approverRoleId)
      );
      setShowAddModal(true);
      setModalLevel(level);
    }
  }, [groupedWorkflow, workflow]);

  const handleSaveApprover = useCallback((approverData: { roleId: string; mandatory: boolean }) => {
    if (editApprover && editApproverIndex !== null) {
      // Edit mode: update existing approver
      setWorkflow((prev) => {
        const updated = [...prev];
        updated[editApproverIndex] = {
          ...updated[editApproverIndex],
          approverRoleId: approverData.roleId,
          mandatory: approverData.mandatory,
          approvalType: approverData.mandatory ? 'Required' : 'Optional',
          approver:
            roleMap[approverData.roleId]?.name ||
            roleMap[approverData.roleId]?.roleName ||
            roleMap[approverData.roleId]?.rolename ||
            '',
        };
        return updated;
      });
      setEditApprover(null);
      setEditApproverIndex(null);
      setShowAddModal(false);
      setModalLevel('');
    } else {
      // Add mode: add new approver
      setWorkflow((prev) => {
        const level = modalLevel;
        const levelNum = parseInt(level.replace('Level ', ''));
        const hasLevel = prev.some((item) => item.level === `Level ${levelNum}`);
        let newWorkflow = prev;
        if (!hasLevel) {
          newWorkflow = prev.map((item) => {
            const itemLevelNum = parseInt(item.level.replace('Level ', ''));
            return itemLevelNum >= levelNum
              ? { ...item, level: `Level ${itemLevelNum + 1}` }
              : item;
          });
        }
        let roleName = '';
        // Get role name from roleMap
        if (roleMap[approverData.roleId]) {
          const roleRecord = roleMap[approverData.roleId];
          roleName = roleRecord.name || roleRecord.roleName || roleRecord.rolename || '';
        }
        console.log('🔍 Role lookup:', {
          roleId: approverData.roleId,
          roleRecord: roleMap[approverData.roleId],
          roleName
        });
        const newApprover = {
          level: `Level ${levelNum}`,
          approver: roleName,
          approverRoleId: approverData.roleId,
          approvalType: approverData.mandatory ? 'Required' : 'Optional',
          mandatory: approverData.mandatory,
        };
        return [...newWorkflow, newApprover].sort(
          (a, b) => parseInt(a.level.replace('Level ', '')) - parseInt(b.level.replace('Level ', ''))
        );
      });
      setShowAddModal(false);
      setModalLevel('');
    }
  }, [editApprover, editApproverIndex, modalLevel, roleMap]);

  const handleDeleteApprover = useCallback((level: string, approverRoleId: string) => {
    setWorkflow((prev) => {
      const levelNum = parseInt(level.replace('Level ', ''));
      let newWorkflow = prev.filter(
        (item) => !(item.level === level && item.approverRoleId === approverRoleId)
      );
      const hasLevel = newWorkflow.some((item) => item.level === level);
      if (!hasLevel) {
        newWorkflow = newWorkflow.map((item) => {
          const itemLevelNum = parseInt(item.level.replace('Level ', ''));
          return itemLevelNum > levelNum
            ? { ...item, level: `Level ${itemLevelNum - 1}` }
            : item;
        });
      }
      // If no approvers left, exit edit mode and preserve dropdown values
      if (newWorkflow.length === 0) {
        setIsEditMode(false);
      }
      return newWorkflow;
    });
  }, []);

  useEffect(() => {
    console.log("🔵 useEffect[isEditMode]: ran (isEditMode =", isEditMode, ")");
    if (!isEditMode) setWorkflow([]);
  }, [isEditMode]);

  // Update hierarchy type when query params change
  useEffect(() => {
    if (typeFromQuery && !isEditMode) {
      setSelectedHierarchyType(typeFromQuery);
    }
  }, [typeFromQuery, isEditMode]);

  // Clear meta fields when hierarchy type changes (except in edit mode)
  useEffect(() => {
    console.log("🟣 useEffect[selectedHierarchyType]: ran (isEditMode =", isEditMode, ", type =", selectedHierarchyType, ")");
    // Only clear meta fields when hierarchy type changes, not when exiting edit mode
    // This preserves dropdown values when closing modal without adding a role
    if (selectedHierarchyType && !isEditMode) {
      setSelectedMetaFields({});
    }
  }, [selectedHierarchyType, isEditMode]);

  // Trigger API call when division changes for outlet approvals
  useEffect(() => {
    const selectedDivisionId = selectedMetaFields['divisionId'];

    if (selectedHierarchyType === 'outlet-approval-hierarchy' && selectedDivisionId) {
      fetchRolesByDivisionFromAPI(selectedDivisionId);
    } else {
      setFilteredRolesFromAPI({ data: null, isLoading: false, error: null });
    }
  }, [selectedMetaFields['divisionId'], selectedHierarchyType, fetchRolesByDivisionFromAPI]);

  // Function to get data for each field type
  const getDataForField = useCallback((field: any) => {
    switch (field.masterName) {
      case 'role':
        // For outlet approvals, use filtered roles; otherwise use all roles
        return selectedHierarchyType === 'outlet-approval-hierarchy' ? filteredRolesData : rolesData;
      case 'claimType':
        return claimTypesData;
      case 'division':
        return divisionsData;
      case 'channel':
        return filteredChannelsData;
      case 'paymentMode':
        return paymentModesData;
      default:
        return [];
    }
  }, [rolesData, claimTypesData, divisionsData, filteredChannelsData, channelsData, selectedHierarchyType, filteredRolesData, paymentModesData]);

  // Function to get loading state for each field type
  const getLoadingStateForField = useCallback((field: any) => {
    switch (field.masterName) {
      case 'role':
        // For outlet approvals, use API loading state; otherwise use main roles loading state
        return selectedHierarchyType === 'outlet-approval-hierarchy'
          ? (filteredRolesFromAPI.isLoading || false)
          : (roleRecordsQuery?.isLoading || false);
      case 'claimType':
        return claimTypeRecordsQuery?.isLoading || false;
      case 'division':
        return divisionRecordsQuery?.isLoading || false;
      case 'channel':
        return channelRecordsQuery?.isLoading || false;
      case 'paymentMode':
        return paymentModeRecordsQuery?.isLoading || false;
      default:
        return false;
    }
  }, [roleRecordsQuery?.isLoading, claimTypeRecordsQuery?.isLoading, divisionRecordsQuery?.isLoading, channelRecordsQuery?.isLoading, selectedHierarchyType, filteredRolesFromAPI.isLoading, paymentModeRecordsQuery?.isLoading]);

  const metaFields = useMemo(() => getMetaFieldsForType(selectedHierarchyType), [selectedHierarchyType]);
  const canCreateConfiguration = selectedHierarchyType &&
    metaFields.filter(field => field.key !== 'paymentModeId').every(field => selectedMetaFields[field.key]);


  const handleMetaFieldChange = useCallback((key: string, value: string) => {
    setSelectedMetaFields(prev => {
      const updated = { ...prev, [key]: value };

      // Clear dependent fields when parent field changes
      if (key === 'divisionId') {
        // Clear channel when division changes
        updated['channelId'] = '';
      }

      return updated;
    });
  }, []);

  // Create individual handlers for each meta field to prevent cascading re-renders
  const createMetaFieldHandler = useCallback((key: string) => {
    return (value: string) => handleMetaFieldChange(key, value);
  }, [handleMetaFieldChange]);

  return (
    <section className="w-full space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`${NavKeys.ApprovalHierarchy}${selectedHierarchyType ? `?type=${selectedHierarchyType}` : ''}`}
          className="hover:bg-primary/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-xl font-medium">
            {mode === 'edit'
              ? `Edit${selectedTypeLabel ? ` ${selectedTypeLabel}` : ''} Approval Hierarchy`
              : `Create${selectedTypeLabel ? ` ${selectedTypeLabel}` : ''} Approval Hierarchy`}
          </h1>
        </div>
      </div>

      <div className="w-full space-y-3 rounded-lg bg-card p-4">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="flex flex-col gap-2 md:flex-row">

            {selectedHierarchyType && metaFields.map((field) => {
              const fieldHandler = createMetaFieldHandler(field.key);
              const fieldData = getDataForField(field);
              const isLoading = getLoadingStateForField(field);

              // Make division and channel fields read-only in edit mode for outlet approvals
              const isReadOnly = isEditMode &&
                selectedHierarchyType === 'outlet-approval-hierarchy' &&
                (field.key === 'divisionId' || field.key === 'channelId');

              return (
                <div key={`${selectedHierarchyType}-${field.key}`} className="flex flex-col gap-1 w-full md:w-auto">
                  {(isReadOnly || (isEditMode && selectedHierarchyType === 'outlet-approval-hierarchy')) && (
                    <label className="text-sm font-medium text-muted-foreground">
                      {field.label} <span className="text-gray-500"></span>
                    </label>
                  )}
                  <DataDropdown
                    data={fieldData}
                    value={selectedMetaFields[field.key] || ''}
                    onChange={fieldHandler}
                    placeholder={`Select ${field.label}`}
                    loading={isLoading}
                    disabled={isReadOnly}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {!isEditMode ? (
              <Button
                onClick={handleAddNew}
                disabled={!canCreateConfiguration}
              >
                {workflow.length > 0 ? 'Edit Configuration' : 'Create Configuration'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={createHierarchy.isPending || updateHierarchy.isPending}
                >
                  {(createHierarchy.isPending || updateHierarchy.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {createHierarchy.isPending || updateHierarchy.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={createHierarchy.isPending || updateHierarchy.isPending}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full">
        {mode === 'edit' && editDataQuery && editDataQuery.isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <Loading text="Loading approval hierarchy..." />
          </div>
        ) : (
          canCreateConfiguration ? (
            workflow.length > 0 ? (
              <div>
                {levels.map((level, levelIndex) => (
                  <div key={level}>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 min-w-fit">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 rounded-xl">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {level.replace('Level ', 'L')}
                          </span>
                        </div>
                        <div className="hidden sm:block">
                          <div className="text-sm font-medium text-foreground">{level}</div>
                          <div className="text-xs text-gray-500">Approval Stage</div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="overflow-x-auto pb-3">
                          <div className="flex justify-center gap-4 max-w-full">
                            {groupedWorkflow[level].map((approver: any, index: number) => (
                              <div
                                key={`${approver.approverRoleId}-${index}`}
                                className="flex-shrink-0 group relative"
                              >
                                <div className="w-120 bg-gradient-to-br from-white to-gray-50/30 border border-gray-200/60 rounded-2xl p-5 hover:border-gray-300/60 transition-all duration-300 backdrop-blur-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-foreground mb-2 truncate pr-2">
                                        {approver.approver}
                                      </h4>
                                      <div className="inline-flex items-center">
                                        <span
                                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${approver.mandatory
                                              ? 'bg-red-50 text-red-700 border-red-200'
                                              : 'bg-secondary/10 text-secondary border-blue-200'
                                            }`}
                                        >
                                          {approver.approvalType}
                                        </span>
                                      </div>
                                    </div>
                                    {isEditMode && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-5 w-5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 border-gray-200 shadow-lg">
                                          <DropdownMenuItem onClick={() => handleEditApprover(level, approver.approverRoleId)}>
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDeleteApprover(level, approver.approverRoleId)}>
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {isEditMode && (
                              <div className="flex-shrink-0 flex items-center">
                                <Button
                                  variant="outline"
                                  onClick={() => handleAddApprover(level)}
                                  className="h-12 w-12 border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-all duration-200 rounded-full group p-0"
                                >
                                  <PlusIcon className="h-5 w-5 group-hover:text-primary transition-colors" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {levelIndex < levels.length - 1 && (
                      <div className="flex items-center justify-center py-8">
                        {isEditMode ? (
                          <div className="flex items-center justify-center w-full max-w-4xl">
                            <div className="flex-1 border-t-2 border-dashed border-gray-400"></div>
                            <Button
                              variant="outline"
                              onClick={() => handleAddApprover(`Level ${parseInt(level.replace('Level ', '')) + 1}`, true)}
                              className="h-10 px-4 mx-4 border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all duration-200 rounded-xl group bg-card"
                            >
                              <PlusIcon className="mr-2 h-3 w-3 group-hover:scale-110 transition-transform" />
                              Add Level
                            </Button>
                            <div className="flex-1 border-t-2 border-dashed border-gray-400"></div>
                          </div>
                        ) : (
                          <div className="w-full max-w-4xl border-t-2 border-dashed border-gray-400"></div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {isEditMode && levels.length > 0 && (
                  <div className="flex items-center justify-center py-8">
                    <Button
                      variant="outline"
                      onClick={() => handleAddApprover(`Level ${levels.length + 1}`)}
                      className="h-10 px-4 border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all duration-200 rounded-xl group bg-card"
                    >
                      <PlusIcon className="mr-2 h-3 w-3 group-hover:scale-110 transition-transform" />
                      Add Level
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Settings className="h-10 w-10 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No Configuration Found
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      No approval hierarchy configuration found for the selected criteria.
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Settings className="h-10 w-10 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Configuration Selected
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Choose a hierarchy type and fill in the required fields to create or view configurations.
                  </p>
                </div>
              </div>
            </div>
          )
        )}
        {isEditMode && (
          <ClaimHierarchyCardAdd
            open={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setEditApprover(null);
              setEditApproverIndex(null);
              // Exit edit mode if no approver was added
              setTimeout(() => {
                if (workflow.length === 0) {
                  setIsEditMode(false);
                }
              }, 0);
            }}
            onSave={handleSaveApprover}
            level={modalLevel}
            roles={filteredRolesData}
            editApprover={editApprover}
          />
        )}
      </div>
    </section>
  );
};

export default ApprovalHierarchyCreationPage;
