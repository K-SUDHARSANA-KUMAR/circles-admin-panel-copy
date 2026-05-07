'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/features/user-managment/permissions/hooks/usePermissions';
import { usePermissionGroups } from '@/features/user-managment/permission-groups/hooks/usePermissionGroups';
import { toast } from 'sonner';
import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { capitalize } from '@/utils/string-utils';
import { MasterRecordMultiSelect } from '@/components/shared/master-record-multi-select';
import { RequirePermission } from '@/components/auth/require-permission';
import { toReadable } from '@/utils/string-utils';
import { UserTypeEnum } from '@/constants/enums/user.enums';
import GenericPageLoading from '@/components/shared/generic-page-loading';
import NavKeys from '@/constants/navkeys';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { MasterRecordCheckboxMultiSelect } from '@/components/shared/master-record-checkbox-multiselect';
import Loading from '@/components/ui/loading';
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

const userTypeOptions = Object.entries(UserTypeEnum).map(([key, value]) => ({
  label: toReadable(value),
  value,
}));

const PermissionGroupCreatePage = () => {
  return (
    <RequirePermission module="permission-groups">
      <PermissionGroupCreateContent />
    </RequirePermission>
  );
};

const PermissionGroupCreateContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const permissionGroupId = searchParams.get('permissionGroupId');
  const isEditMode = mode === 'edit' && permissionGroupId;
  const isViewMode = mode === 'view' && permissionGroupId;
  const [isEditing, setIsEditing] = useState(!!isEditMode);
  const permission = usePermissionChecker('permission-groups');
  const hasEditPermission = permission.has('edit');
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [userType, setUserType] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [device, setDevice] = useState<string[]>([]);
  const [moduleGroup, setModuleGroup] = useState<string[]>([]);
  const [module, setModule] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const { permissions } = usePermissions({
    nonPaginated: true,
    isActive: true,
    ...(selectedDivisions.length > 0 && {
      // Send as a pre-serialized JSON array from the page
      divisionId: JSON.stringify(selectedDivisions),
    }),
  } as any);
  const breadcrumb = getBreadcrumbData(
    'permissionGroups',
    isViewMode ? 'view' : isEditMode ? 'edit' : 'create'
  );
  const { createPermissionGroup, updatePermissionGroup, getPermissionGroup } =
    usePermissionGroups();
  const groupQuery = getPermissionGroup(permissionGroupId || '');
  const permissionGroupMap = useMemo(() => {
    if (!permissions?.data?.data?.items) {
      return new Map<
        string,
        Map<string, { permissionId: string; action: string }[]>
      >();
    }

    const platformToGroupMap = new Map<
      string,
      Map<string, { permissionId: string; action: string }[]>
    >();

    const permissionList = permissions.data.data.items;

    permissionList.forEach((perm: any) => {
      const code: string | undefined = perm.code;
      if (!code) return;

      const parts = code.split(':');

      // Support both legacy (group:action) and new (platform:group:action) formats
      let platform: string | undefined;
      let group: string | undefined;
      let action: string | undefined;

      if (parts.length >= 3) {
        [platform, group, action] = parts;
      } else if (parts.length === 2) {
        // Default legacy permissions to 'web' platform for display grouping
        platform = 'web';
        [group, action] = parts;
      }

      if (!platform || !group || !action) return;

      const permissionId: string = perm.permissionId as string;

      // Ensure maps exist
      const groupMap =
        platformToGroupMap.get(platform) ??
        new Map<string, { permissionId: string; action: string }[]>();
      const groupPermissions = groupMap.get(group) ?? [];

      if (
        !groupPermissions.some(
          (p: { permissionId: string; action: string }) =>
            p.permissionId === permissionId
        )
      ) {
        groupPermissions.push({ permissionId, action });
        groupMap.set(group, groupPermissions);
        platformToGroupMap.set(platform, groupMap);
      }
    });

    return platformToGroupMap;
  }, [permissions?.data?.data]);

  const handlePermissionSelect = (
    id: string,
    platform: string,
    group: string,
    isAdmin: boolean
  ) => {
    const groupMap =
      permissionGroupMap.get(platform) ??
      new Map<string, { permissionId: string; action: string }[]>();
    const groupPermissions = groupMap.get(group) ?? [];
    const groupIds: string[] = groupPermissions.map(
      (perm: { permissionId: string; action: string }) => perm.permissionId
    );

    setSelectedPermissions((prev) => {
      const prevSelected = new Set(prev);
      const isAllSelected = groupIds.every((permId: string) =>
        prevSelected.has(permId)
      );

      if (isAdmin) {
        if (isAllSelected) {
          // remove all group permissions if admin is unchecked
          groupIds.forEach((groupId: string) => prevSelected.delete(groupId));
        } else {
          // add all group permissions if admin is checked
          groupIds.forEach((groupId: string) => prevSelected.add(groupId));
        }
      } else {
        if (isAllSelected || prevSelected.has(id)) {
          // if admin is checked and specific permission is unchecked, remove that permission and keep others
          prevSelected.delete(id);
        } else {
          // if specific permission is checked, add it
          prevSelected.add(id);
        }
      }
      return prevSelected;
    });
  };

  useEffect(() => {
    if ((isEditMode || isViewMode) && groupQuery.data?.data) {
      setName(groupQuery.data.data.name || '');
      setSelectedPermissions(new Set(groupQuery.data.data.permissions || []));
      setUserType(groupQuery.data.data.userType || '');
      setSelectedRoles(groupQuery.data.data.roleIds || []);
      setSelectedDivisions(groupQuery.data.data.divisionIds || []);
    }
  }, [isEditMode, isViewMode, groupQuery.data]);

  const formatName = (value) => {
    return value
      .toLowerCase()
      .split(' ')
      .map((word) =>
        word
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join('-')
      )
      .join(' ');
  };

  const handleCancel = () => {
    router.push(NavKeys.PermissionGroups);
  };

  const handleModule = (module: string[]) => {
    setModule(module);
  };

  // Fixed action order for displaying permissions
  const actionOrder = ['view', 'create', 'edit', 'delete', 'log'];
  const getActionPriority = (action: string) => {
    const idx = actionOrder.indexOf(action?.toLowerCase?.() ?? '');
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  const handleSubmit = async () => {
    if (
      !name ||
      selectedPermissions?.size === 0 ||
      !userType ||
      (userType !== 'temporary' && selectedRoles.length === 0)
    ) {
      toast.error('Please fill all required fields');
      return;
    }
    const payload = {
      name,
      permissions: Array.from(selectedPermissions),
      userType,
      ...(userType !== 'temporary' && { roleIds: selectedRoles }),
      divisionIds: selectedDivisions,
    };
    try {
      if (isEditMode) {
        toast.loading('Updating group...', { id: 'pg-action' });
        await updatePermissionGroup.mutateAsync({
          permissionGroupId: permissionGroupId!,
          data: payload,
        });
        toast.success('Group updated successfully!', { id: 'pg-action' });
      } else {
        toast.loading('Creating group...', { id: 'pg-action' });
        await createPermissionGroup.mutateAsync(payload);
        toast.success('Group created successfully!', { id: 'pg-action' });
      }
      router.push(NavKeys.PermissionGroups);
    } catch {
      toast.error(
        `Failed to ${isEditMode ? 'update' : 'create'} group. Please try again.`,
        { id: 'pg-action' }
      );
    }
  };

  if ((isEditMode || isViewMode) && groupQuery.isLoading) {
    return (
      <section className="flex h-full items-center justify-center">
        <GenericPageLoading
          loadingText="Loading Permission Groups"
          inline={true}
        />
      </section>
    );
  }

  const handleEditToggle = () => {
    if (isViewMode) {
      router.push(
        `${NavKeys.PermissionGroupCreation}?mode=edit&permissionGroupId=${permissionGroupId}`
      );
    } else {
      setIsEditing(!isEditing);
    }
  };

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-card p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href={NavKeys.PermissionGroups}
                className="flex items-center gap-1"
              >
                <Home className="h-3 w-3" /> Permissions
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {isEditMode
                  ? 'Edit Permission Group'
                  : isViewMode
                    ? 'View Permission Group'
                    : 'Create Permission Group'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={NavKeys.PermissionGroups}
              className="hover:bg-primary/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">
                {isEditMode
                  ? 'Edit Permission Group'
                  : isViewMode
                    ? 'View Permission Group'
                    : 'Create New Permission Group'}
              </h1>
              <p className="text-sm text-neutral-500">
                {isEditMode
                  ? 'Update Permission Group information'
                  : isViewMode
                    ? 'View Permission Group details'
                    : 'Provide information to create Permission Group'}
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

      <div className="space-y-6">
        {/* Group Information */}
        <div className="rounded-lg bg-card p-4">
          <div className="bg-background rounded-lg p-2 text-lg font-medium">
            Group Information
          </div>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-medium">Name</Label>
                <Input
                  placeholder="Group name"
                  value={name}
                  onChange={(e) => {
                    const formattedValue = formatName(e.target.value);
                    setName(formattedValue);
                  }}
                  className="w-full"
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Divisions</Label>
                <MasterRecordCheckboxMultiSelect
                  masterName="division"
                  value={selectedDivisions}
                  onChange={(values) => setSelectedDivisions(values)}
                  placeholder="Select divisions"
                  className="w-full"
                  disabled={isViewMode}
                />
              </div>
            </div>
            {/* Second Row: User Type only */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">User Type</Label>
                <Select
                  value={userType}
                  onValueChange={setUserType}
                  disabled={isViewMode}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    {userTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Third Row: Roles - Full Width */}
            {userType !== 'temporary' && (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Roles</Label>
                  <MasterRecordMultiSelect
                    masterName="role"
                    value={selectedRoles}
                    onChange={setSelectedRoles}
                    placeholder="Select roles"
                    className="w-full"
                    maxToShow={10}
                    disabled={isViewMode}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Permissions Loading */}
        {selectedDivisions.length > 0 && permissions?.isLoading && (
          <div className="rounded-lg bg-card p-4">
            <Loading text="Loading Permissions" className="py-8" />
          </div>
        )}
        {/* Web Permission Information */}
        {selectedDivisions.length > 0 &&
          !permissions?.isLoading &&
          permissionGroupMap.get('web') && (
            <div className="rounded-lg bg-card p-4">
              <div className="bg-background rounded-lg p-2 text-lg font-medium">
                Web Permission Information
              </div>
              <div className="mt-5">
                {Array.from(
                  (permissionGroupMap.get('web') ?? new Map()).entries()
                ).map(([group, groupPermissions]) => {
                  const groupIds = groupPermissions.map(
                    (p: { permissionId: string; action: string }) =>
                      p.permissionId
                  );
                  const isAdminChecked = groupIds.every((id: string) =>
                    selectedPermissions.has(id)
                  );
                  const listItemStyles = 'flex items-center gap-x-2';
                  const sortedGroupPermissions = [...groupPermissions].sort(
                    (a: { action: string }, b: { action: string }) =>
                      getActionPriority(a.action) - getActionPriority(b.action)
                  );
                  return (
                    <div
                      key={`web-${group}`}
                      className="mb-6 grid w-full grid-cols-[1fr_4fr]"
                    >
                      <h3 className="font-semibold">{toReadable(group)}</h3>
                      <ul className="flex flex-wrap items-center justify-start gap-8">
                        {/* Admin (Select All) Checkbox */}
                        <li className={`${listItemStyles}`}>
                          <Checkbox
                            id={`web:${group}:all`}
                            checked={isAdminChecked}
                            onCheckedChange={() =>
                              handlePermissionSelect(
                                `web:${group}:all`,
                                'web',
                                group,
                                true
                              )
                            }
                            disabled={isViewMode}
                          />
                          <Label htmlFor={`web:${group}:all`}>Admin</Label>
                        </li>

                        {/* Actual Group Permissions */}
                        {sortedGroupPermissions.map(
                          (groupPermission: {
                            permissionId: string;
                            action: string;
                          }) => {
                            const isChecked = selectedPermissions.has(
                              groupPermission.permissionId
                            );

                            return (
                              <li
                                key={groupPermission.permissionId}
                                className={`${listItemStyles} ${isAdminChecked ? 'opacity-70' : ''}`}
                              >
                                <Checkbox
                                  id={groupPermission.permissionId}
                                  checked={isChecked}
                                  onCheckedChange={() =>
                                    handlePermissionSelect(
                                      groupPermission.permissionId,
                                      'web',
                                      group,
                                      false
                                    )
                                  }
                                  disabled={isViewMode}
                                />
                                <Label htmlFor={groupPermission.permissionId}>
                                  {capitalize(groupPermission.action)}
                                </Label>
                              </li>
                            );
                          }
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Mobile Permission Information */}
        {selectedDivisions.length > 0 &&
          !permissions?.isLoading &&
          permissionGroupMap.get('mobile') && (
            <div className="mt-6 rounded-lg bg-card p-4">
              <div className="bg-background rounded-lg p-2 text-lg font-medium">
                Mobile Permission Information
              </div>
              <div className="mt-5">
                {Array.from(
                  (permissionGroupMap.get('mobile') ?? new Map()).entries()
                ).map(([group, groupPermissions]) => {
                  const groupIds = groupPermissions.map(
                    (p: { permissionId: string; action: string }) =>
                      p.permissionId
                  );
                  const isAdminChecked = groupIds.every((id: string) =>
                    selectedPermissions.has(id)
                  );
                  const listItemStyles = 'flex items-center gap-x-2';
                  const sortedGroupPermissions = [...groupPermissions].sort(
                    (a: { action: string }, b: { action: string }) =>
                      getActionPriority(a.action) - getActionPriority(b.action)
                  );
                  return (
                    <div
                      key={`mobile-${group}`}
                      className="mb-6 grid grid-cols-[1fr_4fr]"
                    >
                      <h3 className="font-semibold">{toReadable(group)}</h3>
                      <ul className="flex flex-wrap items-center justify-start gap-8">
                        {/* Admin (Select All) Checkbox */}
                        <li className={`${listItemStyles}`}>
                          <Checkbox
                            id={`mobile:${group}:all`}
                            checked={isAdminChecked}
                            onCheckedChange={() =>
                              handlePermissionSelect(
                                `mobile:${group}:all`,
                                'mobile',
                                group,
                                true
                              )
                            }
                            disabled={isViewMode}
                          />
                          <Label htmlFor={`mobile:${group}:all`}>Admin</Label>
                        </li>

                        {/* Actual Group Permissions */}
                        {sortedGroupPermissions.map(
                          (groupPermission: {
                            permissionId: string;
                            action: string;
                          }) => {
                            const isChecked = selectedPermissions.has(
                              groupPermission.permissionId
                            );

                            return (
                              <li
                                key={groupPermission.permissionId}
                                className={`${listItemStyles} ${isAdminChecked ? 'opacity-70' : ''}`}
                              >
                                <Checkbox
                                  id={groupPermission.permissionId}
                                  checked={isChecked}
                                  onCheckedChange={() =>
                                    handlePermissionSelect(
                                      groupPermission.permissionId,
                                      'mobile',
                                      group,
                                      false
                                    )
                                  }
                                  disabled={isViewMode}
                                />
                                <Label htmlFor={groupPermission.permissionId}>
                                  {capitalize(groupPermission.action)}
                                </Label>
                              </li>
                            );
                          }
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        {!isViewMode && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createPermissionGroup.isPending ||
                updatePermissionGroup.isPending ||
                !name ||
                selectedPermissions?.size === 0 ||
                !userType ||
                (userType !== 'temporary' && selectedRoles.length === 0)
              }
            >
              {isEditMode
                ? updatePermissionGroup.isPending
                  ? 'Updating...'
                  : 'Update Group'
                : createPermissionGroup.isPending
                  ? 'Creating...'
                  : 'Create Group'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default PermissionGroupCreatePage;
