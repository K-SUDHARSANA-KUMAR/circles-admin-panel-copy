'use client';

import { ArrowLeftIcon, Home, PlusIcon, TrashIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useMasterGroups } from '@/features/master-managment/hooks/useMasterGroups';
import { generateFieldId } from '@/utils/id-utils';
import { useMasterSchema } from '@/features/master-managment/hooks/useMasterSchema';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import {
  FieldType,
  FIELD_VALUE_TYPES,
  FieldValueType,
  RELATIONSHIP_TYPES,
} from '@/constants/master-schema';
import { RequirePermission } from '@/components/auth/require-permission';
import { breadcrumbConfig, getBreadcrumbData } from '@/constants/breadcrumb-config';
import { capitalizeDisplayName, readableToCamelCase, toCamelCase, camelCaseToReadable } from '@/utils/string-utils';
import NavKeys from '@/constants/navkeys';

interface Field {
  id: string;
  fieldType: FieldValueType | '';
  fieldDisplayName: string;
  fieldName: string;
  isRequired: boolean;
  isUnique: boolean;
  masterId?: string;
  relation?: string;
  dependentMaster?: string;
}

const MasterSchemaCreationPage = () => {
  return (
    <RequirePermission module="master-schema" action={['create', 'edit']}>
      <MasterSchemaCreationContent />
    </RequirePermission>
  );
};

const MasterSchemaCreationContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editMode = searchParams.get('edit');
  const groupIdFromUrl = searchParams.get('groupId');

  const { groups } = useMasterGroups();
  const { schemas, schemaById, createSchema, updateSchema } = useMasterSchema(editMode || undefined, editMode || undefined);

  const [schemaName, setSchemaName] = useState('');
  const [schemaDisplayName, setSchemaDisplayName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<{
    groupId: string;
    groupName: string;
  } | null>(null);
  const [fields, setFields] = useState<Field[]>([
    {
      id: '1',
      fieldType: '',
      fieldDisplayName: '',
      fieldName: '',
      isRequired: false,
      isUnique: false,
    },
  ]);

  useEffect(() => {
    if (groupIdFromUrl && groups.data?.data && !editMode) {
      const group = groups.data.data.find((g: any) => g.groupId === groupIdFromUrl);
      if (group) {
        setSelectedGroup({
          groupId: group.groupId,
          groupName: group.groupName,
        });
      }
    }
  }, [groupIdFromUrl, groups.data, editMode]);

  useEffect(() => {
    if (editMode && schemaById.data?.data) {
      const schemaToEdit = schemaById.data.data;
      setSchemaName(schemaToEdit.name);
      setSchemaDisplayName(schemaToEdit.displayName);
      setSelectedGroup({
        groupId: schemaToEdit.groupId,
        groupName: schemaToEdit.groupName,
      });

      const mappedFields = schemaToEdit.fields.map(
        (field: any, index: number) => ({
          id: (index + 1).toString(),
          fieldType: (field.type.charAt(0).toUpperCase() +
            field.type.slice(1)) as FieldValueType,
          fieldDisplayName: camelCaseToReadable(field.name),
          fieldName: field.name,
          isRequired: field.required || false,
          isUnique: field.unique || false,
          ...(field.type === 'master' && {
            masterId: field.masterType,
            relation: field.relationshipType,
            ...(field.dependentName && {
              dependentMaster: field.dependentName,
            }),
          }),
        })
      );
      setFields(mappedFields);
    }
  }, [editMode, schemaById.data]);

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        id: generateFieldId(),
        fieldType: '',
        fieldDisplayName: '',
        fieldName: '',
        isRequired: false,
        isUnique: false,
      },
    ]);
  };

  const handleDisplayNameChange = (value: string) => {
    const capitalizedValue = capitalizeDisplayName(value);
    setSchemaDisplayName(capitalizedValue);
    setSchemaName(readableToCamelCase(capitalizedValue));
  };

  const handleFieldDisplayNameChange = (fieldId: string, value: string) => {
    const capitalizedValue = capitalizeDisplayName(value);
    const camelCaseValue = readableToCamelCase(capitalizedValue);
    handleFieldChange(fieldId, {
      fieldDisplayName: capitalizedValue,
      fieldName: camelCaseValue,
    });
  };

  const handleFieldChange = (fieldId: string, updates: Partial<Field>) => {
    setFields(
      fields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );

  };

  const handleRemoveField = (fieldId: string) => {
    setFields(fields.filter((field) => field.id !== fieldId));
  };

  const handleSubmit = async () => {
    if (!selectedGroup) return;

    const payload = {
      name: schemaName,
      displayName: schemaDisplayName,
      groupId: selectedGroup.groupId,
      groupName: selectedGroup.groupName,
      fields: fields.map((field) => {
        const baseField = {
          type: field.fieldType.toLowerCase(),
          required: field.isRequired,
          unique: field.isUnique,
        };

        if (field.fieldType === 'Master') {
          const masterField: any = {
            ...baseField,
            masterType: field.masterId,
            relationshipType: field.relation,
          };

          if (field.dependentMaster) {
            masterField.dependentType = 'master';
            masterField.dependentName = field.dependentMaster;
          }

          return masterField;
        } else {
          return {
            ...baseField,
            name: field.fieldName,
          };
        }
      }),
    };

    try {
      if (editMode) {
        toast.loading('Updating master schema...', { id: 'schema-action' });
        await updateSchema.mutateAsync({ schemaId: editMode, data: payload });
        toast.success('Master schema updated successfully!', {
          id: 'schema-action',
        });
      } else {
        toast.loading('Creating master schema...', { id: 'schema-action' });
        await createSchema.mutateAsync(payload);
        toast.success('Master schema created successfully!', {
          id: 'schema-action',
        });
      }
      
      const groupIdToPreserve = groupIdFromUrl || selectedGroup.groupId;
      const backUrl = groupIdToPreserve 
        ? `${NavKeys.MasterSchema}?groupId=${groupIdToPreserve}`
        : NavKeys.MasterSchema;
      router.push(backUrl);
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.message ||
        `Failed to ${editMode ? 'update' : 'create'} master schema. Please try again.`;
      toast.error(apiMessage, { id: 'schema-action' });
    }
  };

  const handleCancel = () => {
    const groupIdToPreserve = groupIdFromUrl || selectedGroup?.groupId;
    const backUrl = groupIdToPreserve 
      ? `${NavKeys.MasterSchema}?groupId=${groupIdToPreserve}`
      : NavKeys.MasterSchema;
    router.push(backUrl);
  };

  if (groups.isLoading || schemas.isLoading || (editMode && schemaById.isLoading)) {
    return (
      <section className="flex h-full items-center justify-center">
        <Loading />
      </section>
    );
  }

  if (groups.error || schemas.error || (editMode && schemaById.error)) {
    return (
      <section className="flex h-full items-center justify-center">
        <GenericError text="Error loading data" />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg bg-white">
        <BreadcrumbHeader 
          {...getBreadcrumbData('masterShema', editMode ? 'edit' : 'create')}
          backHref={groupIdFromUrl 
            ? `${NavKeys.MasterSchema}?groupId=${groupIdFromUrl}`
            : NavKeys.MasterSchema
          }
        />
      </div>

      {/* The Schema Information Fields */}
      <div className="rounded-lg bg-white p-4">
        <div className="bg-background rounded-lg p-2 text-lg">
          Schema Information
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Schema Display Name</Label>
            <Input
              placeholder="Enter schema display name"
              value={schemaDisplayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Schema Name</Label>
            <Input
              placeholder="Auto Generated from Display Name"
              value={schemaName}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label>Group</Label>
            <Select
              value={selectedGroup?.groupId}
              onValueChange={(value) => {
                const group = groups.data?.data.find(
                  (g: any) => g.groupId === value
                );
                if (group) {
                  setSelectedGroup({
                    groupId: group.groupId,
                    groupName: group.groupName,
                  });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.data?.data.map((group: any) => (
                  <SelectItem key={group.groupId} value={group.groupId}>
                    {group.displayName || group.groupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* The Master Schema Fields */}
      <div className="rounded-lg bg-white p-4">
        <div className="bg-background rounded-lg p-2 text-lg">Fields</div>
        <div className="mt-6 space-y-8">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-4 border-neutral-200 border-2 p-4 rounded-lg">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Field Value Type</Label>
                  <Select
                    value={field.fieldType}
                    onValueChange={(value) =>
                      handleFieldChange(field.id, {
                        fieldType: value as FieldValueType,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a field value type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_VALUE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {field.fieldType && field.fieldType !== FieldType.Master && (
                  <div className="space-y-2">
                    <Label>Field Display Name</Label>
                    <Input
                      placeholder="Enter Field Display Name"
                      value={field.fieldDisplayName}
                      onChange={(e) =>
                        handleFieldDisplayNameChange(field.id, e.target.value)
                      }
                    />
                  </div>
                )}

                {field.fieldType && field.fieldType !== FieldType.Master && (
                  <div className="space-y-2">
                    <Label>Field Name</Label>
                    <Input
                      placeholder="Field Name"
                      value={field.fieldName}
                      disabled
                    />
                  </div>
                )}

                {field.fieldType === FieldType.Master && (
                  <>
                    <div className="space-y-2">
                      <Label>Master</Label>
                      <Select
                        value={field.masterId}
                        onValueChange={(value) =>
                          handleFieldChange(field.id, { masterId: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a Master" />
                        </SelectTrigger>
                        <SelectContent>
                          {schemas.isLoading ? (
                            <SelectItem value="" disabled>
                              Loading schemas...
                            </SelectItem>
                          ) : schemas.data?.data?.items && Array.isArray(schemas.data.data.items) ? (
                            schemas.data.data.items.map((schema: any) => (
                              <SelectItem key={schema.name} value={schema.name}>
                                {schema.displayName}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              No schemas available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Relation</Label>
                      <Select
                        value={field.relation}
                        onValueChange={(value) =>
                          handleFieldChange(field.id, { relation: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a relation type" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Dependent Master</Label>
                      <Select
                        value={field.dependentMaster || 'none'}
                        onValueChange={(value) =>
                          handleFieldChange(field.id, { dependentMaster: value === 'none' ? undefined : value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a Dependent Master (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {schemas.isLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading schemas...
                            </SelectItem>
                          ) : schemas.data?.data?.items && Array.isArray(schemas.data.data.items) ? (
                            schemas.data.data.items.map((schema: any) => (
                              <SelectItem key={schema.name} value={schema.name}>
                                {schema.displayName}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-schemas" disabled>
                              No schemas available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={field.isRequired}
                      onCheckedChange={(checked) =>
                        handleFieldChange(field.id, {
                          isRequired: checked as boolean,
                        })
                      }
                    />
                    <Label>Required</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={field.isUnique}
                      onCheckedChange={(checked) =>
                        handleFieldChange(field.id, {
                          isUnique: checked as boolean,
                        })
                      }
                    />
                    <Label>Unique</Label>
                  </div>
                </div>
                {index > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveField(field.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove Field
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={handleAddField}>
            <PlusIcon className="h-4 w-4" />
            Add Field
          </Button>
        </div>
      </div>

      {/* The Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            createSchema.isPending ||
            updateSchema.isPending ||
            !schemaName ||
            !schemaDisplayName ||
            !selectedGroup
          }
        >
          {editMode
            ? updateSchema.isPending
              ? 'Updating Master Schema...'
              : 'Update Master Schema'
            : createSchema.isPending
              ? 'Creating Master Schema...'
              : 'Create Master Schema'}
        </Button>
      </div>
    </section>
  );
};

export default MasterSchemaCreationPage;
