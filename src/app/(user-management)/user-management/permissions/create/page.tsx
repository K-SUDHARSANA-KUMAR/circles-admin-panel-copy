'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePermissions } from '@/features/user-managment/permissions/hooks/usePermissions';
import { toast } from 'sonner';
import { RequirePermission } from '@/components/auth/require-permission';
import { Label } from '@/components/ui/label';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import NavKeys from '@/constants/navkeys';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import Link from 'next/link';
import { ArrowLeftIcon, Home, Shield, Edit } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const PermissionCreatePage = () => {
  return (
    <RequirePermission module="permissions">
      <PermissionCreateContent />
    </RequirePermission>
  );
};

const PermissionCreateContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const permissionId = searchParams.get('permissionId');
  const isEditMode = mode === 'edit' && permissionId;
  const isViewMode = mode === 'view' && permissionId;
  const permission = usePermissionChecker('permissions');
  const hasEditPermission = permission.has('edit');
  const { createPermission, updatePermission, getPermission } =
    usePermissions();
  const permissionQuery = getPermission(permissionId || '');
  const { records: divisionRecords } = useMasterRecords('division', undefined, 1, 1000, true);
  const { records: deviceRecords } = useMasterRecords('deviceType', undefined, 1, 1000, true);
  const { records: moduleRecords } = useMasterRecords('modules', undefined, 1, 1000, true);
  const { records: menuRightsRecords } = useMasterRecords('menuRights', undefined, 1, 1000, true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [division, setDivision] = useState<string[]>([]);
  const [device, setDevice] = useState<string>('');
  const [module, setModule] = useState<string>('');
  const [initialized, setInitialized] = useState(false);

  const breadcrumb = getBreadcrumbData(
    'permissions',
    isViewMode ? 'view' : isEditMode ? 'edit' : 'create'
  );

  // Helper function to map division codes back to division IDs
  const mapDivisionCodesToIds = (codes: string[]): string[] => {
    return codes.map(code => {
      const division = divisionRecords?.data?.find((record: any) => record.shortCode === code);
      return (division?.divisionId as string) || code; // fallback to code if not found
    });
  };

  // Helper function to get display name from code
  const getDisplayNameFromCode = (masterName: string, code: string) => {
    let records;
    let nameField;
    
    switch (masterName) {
      case 'deviceType':
        records = deviceRecords?.data;
        nameField = 'deviceTypeName';
        break;
      case 'modules':
        records = moduleRecords?.data;
        nameField = 'modulesName';
        break;
      case 'menuRights':
        records = menuRightsRecords?.data;
        nameField = 'menuRightsName';
        break;
      default:
        return code;
    }
    
    if (records) {
      const record = records.find((r: any) => {
        if (masterName === 'menuRights') {
          return r.code === code;
        } else {
          return r[`${masterName}Code`] === code;
        }
      });
      return record?.[nameField] || code;
    }
    
    return code;
  };

  // Generate suggested name based on selections
  const generateSuggestedName = () => {
    if (!device || !module || !code) return '';
    
    const deviceName = getDisplayNameFromCode('deviceType', device);
    const moduleName = getDisplayNameFromCode('modules', module);
    const menuRightsName = getDisplayNameFromCode('menuRights', code);
    
    return `${deviceName} - ${moduleName} - ${menuRightsName}`;
  };

  useEffect(() => {
    if (
      (isEditMode || isViewMode) &&
      !initialized &&
      !permissionQuery.isLoading &&
      permissionQuery.data?.data
    ) {
      const permissionData = permissionQuery.data.data;
      const [deviceCode, moduleCode, menuRightsCode] = (permissionData.code || '').split(':');
      
      setName(permissionData.name || '');
      setDevice(deviceCode || '');
      setModule(moduleCode || '');
      setCode(menuRightsCode || '');
      
      // Set division values - we need to map divisionIds (array of strings) back to division shortCode
      if (permissionData.divisionIds && Array.isArray(permissionData.divisionIds)) {
        const divisionCodes = permissionData.divisionIds.map((id: string) => {
          const division = divisionRecords?.data?.find((record: any) => record.divisionId === id);
          return division?.shortCode || id; // fallback to id if not found
        });
        setDivision(divisionCodes);
      }

      setInitialized(true);
    }
  }, [isEditMode, isViewMode, initialized, permissionQuery.isLoading, permissionQuery.data, divisionRecords]);

  // Auto-suggest name based on selections (both create and edit; guard edit until initialized)
  useEffect(() => {
    const canGenerate = device && module && code;
    const canApply = !isEditMode || initialized;
    if (canGenerate && canApply) {
      const suggestedName = generateSuggestedName();
      if (suggestedName) {
        setName(suggestedName);
      }
    }
  }, [device, module, code, isEditMode, initialized, deviceRecords, moduleRecords, menuRightsRecords]);

  const handleCancel = () => {
    router.push(NavKeys.Permissions);
  };

  const handleSubmit = async () => {
    if (!name || !module || !code || !device || !division || division.length === 0) {
      toast.error('Please fill all required fields');
      return; // stop execution if any field is missing
    }

    // Map division codes back to divisionIds for the API
    const divisionIds = mapDivisionCodesToIds(division);

    const payload = {
      name,
      divisionIds,
      code: `${device}:${module}:${code}`,
    };
    try {
      if (isEditMode) {
        toast.loading('Updating permission...', { id: 'perm-action' });
        await updatePermission.mutateAsync({
          permissionId: permissionId!,
          data: payload,
        });
        toast.success('Permission updated successfully!', {
          id: 'perm-action',
        });
      } else {
        toast.loading('Creating permission...', { id: 'perm-action' });
        await createPermission.mutateAsync(payload);
        toast.success('Permission created successfully!', {
          id: 'perm-action',
        });
      }
      router.push(NavKeys.Permissions);
    } catch {
      toast.error(
        `Failed to ${isEditMode ? 'update' : 'create'} permission. Please try again.`,
        { id: 'perm-action' }
      );
    }
  };

  const handleEditToggle = () => {
    if (isViewMode) {
      router.push(
        `${NavKeys.PermissionCreation}?mode=edit&permissionId=${permissionId}`
      );
    }
  };

  if ((isEditMode || isViewMode) && permissionQuery.isLoading) {
    return (
      <section className="flex h-full items-center justify-center">
        <div>Loading...</div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-card p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href={NavKeys.Permissions}
                className="flex items-center gap-1"
              >
                <Home className="h-3 w-3" /> Permissions
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {isEditMode
                  ? 'Edit Permission'
                  : isViewMode
                    ? 'View Permission'
                    : 'Create Permission'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={NavKeys.Permissions}
              className="hover:bg-primary/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">
                {isEditMode
                  ? 'Edit Permission'
                  : isViewMode
                    ? 'View Permission'
                    : 'Create New Permission'}
              </h1>
              <p className="text-sm text-neutral-500">
                {isEditMode
                  ? 'Update permission information'
                  : isViewMode
                    ? 'View permission details'
                    : 'Provide information to create permission'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isViewMode && hasEditPermission && (
              <Button
                variant="outline"
                onClick={handleEditToggle}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            <div className="bg-primary/10 w-fit rounded-full p-2">
              <Shield className="text-primary h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-card p-4">
        <div className="bg-background rounded-lg p-2 text-lg">
          Permission Information
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="font-medium">Name</Label>
            <Input
              placeholder="Permission name (auto-suggested based on selections)"
              value={name}
              disabled
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Division</Label>
            <MasterRecordCheckboxMultiSelect
              masterName="division"
              value={division}
              onChange={setDivision}
              placeholder="Division"
              className="w-full"
              displayName="division"
              disabled={isViewMode}
            />
          </div>
        </div>
      </div>
      
      <div className="rounded-lg bg-card p-4">
        <div className="bg-background rounded-lg p-2 text-lg">
          Permission Access Configuration
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="font-medium">Device</Label>
            <MasterRecordSelect
              masterName="deviceType"
              value={device}
              onChange={setDevice}
              placeholder="Device Type"
              className="w-full"
              useCode={true}
              disabled={isViewMode}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Module</Label>
            <MasterRecordSelect
              masterName="modules"
              value={module}
              onChange={setModule}
              placeholder="Select Module"
              className="w-full"
              useCode={true}
              disabled={isViewMode}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Menu Rights</Label>
            <MasterRecordSelect
              masterName="menuRights"
              value={code}
              onChange={setCode}
              placeholder="Select Menu Rights"
              className="w-full"
              useCode={true}
              disabled={isViewMode}
            />
          </div>
        </div>
      </div>
      {!isViewMode && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createPermission.isPending ||
              updatePermission.isPending
            }
          >
            {isEditMode
              ? updatePermission.isPending
                ? 'Updating...'
                : 'Update Permission'
              : createPermission.isPending
                ? 'Creating...'
                : 'Create Permission'}
          </Button>
        </div>
      )}
    </section>
  );
};

export default PermissionCreatePage;
