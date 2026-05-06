'use client';

import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import GenericPageError from '@/components/shared/generic-page-error';
import GenericPageLoading from '@/components/shared/generic-page-loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { MasterRecordMultiSelect } from '@/components/shared/master-record-multi-select';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { Switch } from '@/components/ui/switch';
import { 
  FieldTypes, 
  isMasterFieldWithMultipleValues, 
  isMasterFieldWithArrayValues,
  isMultipleRelationship 
} from '@/constants/master-schema';
import NavKeys from '@/constants/navkeys';
import { useMasterGroups } from '@/features/master-managment/hooks/useMasterGroups';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { useMasterSchema } from '@/features/master-managment/hooks/useMasterSchema';
import { PaginatedResponse, MasterRecord } from '@/features/master-managment/types/master.types';
import { camelCaseToReadable } from '@/utils/string-utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { useAppDispatch } from '@/store/hooks';
import { setMasterRecords } from '@/store/slices/masterRecordsSlice';

interface FieldData {
  [key: string]: any;
}

// Helper function to format date from API to dd-MM-yyyy format
const formatDateFromApi = (dateValue: any): string => {
  if (!dateValue) return '';
  
  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      // Try parsing ISO date first
      if (dateValue.includes('T') || dateValue.includes('Z')) {
        date = parseISO(dateValue);
      } else {
        // Handle other date formats
        date = new Date(dateValue);
      }
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return '';
    }
    
    if (!isValid(date)) return '';
    
    // Format as dd-MM-yyyy for display
    return format(date, 'dd-MM-yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Helper function to convert dd-MM-yyyy to yyyy-MM-dd for API submission
const formatDateForApi = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Parse dd-MM-yyyy format
    if (dateString.includes('-') && dateString.length === 10) {
      const [day, month, year] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (!isValid(date)) return '';
      
      // Format as yyyy-MM-dd for API
      return format(date, 'yyyy-MM-dd');
    }
    
    return dateString;
  } catch (error) {
    console.error('Error formatting date for API:', error);
    return dateString;
  }
};

const MasterRecordsManagePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const schemaName = searchParams.get('schemaName');
  const editMode = searchParams.get('edit');

  const [formData, setFormData] = useState<FieldData>({});
  const dispatch = useAppDispatch();

  const { groups } = useMasterGroups();

  const { schemaById } = useMasterSchema(
    schemaName || undefined,
    editMode || undefined
  );
  const { recordById, createRecord, updateRecord } = useMasterRecords(
    schemaName || '',
    editMode || undefined,
    1,
    10
  );

  // Load transportmode master records when viewing grade masters or transport masters
  const { records: transportModeRecords } = useMasterRecords(
    'transportmode',
    undefined,
    0,
    1000,
    true
  );

  // Store transportmode records in Redux when viewing grade masters or transport masters
  const transportModeDataSignatureRef = useRef<string>('');
  
  useEffect(() => {
    // Check if we need transport mode records (for grade masters or transport masters)
    const needsTransportMode = schemaName === 'grade' || schemaName === 'transportmode' || schemaName === 'transport';
    if (needsTransportMode && transportModeRecords?.data) {
      // Extract items from paginated response
      let transportModeData: any[] = [];
      if (Array.isArray(transportModeRecords.data)) {
        transportModeData = transportModeRecords.data;
      } else {
        const data = transportModeRecords.data as unknown;
        if (data && typeof data === 'object' && data !== null && 'items' in data) {
          const paginatedData = data as PaginatedResponse<MasterRecord>;
          transportModeData = Array.isArray(paginatedData.items) ? paginatedData.items : [];
        }
      }
      if (transportModeData.length > 0) {
        // Create a stable signature to compare using transportModeName
        const dataSignature = JSON.stringify(
          transportModeData.map((r: any) => r.transportModeName || '').sort()
        );
        // Only update if the data has actually changed
        if (transportModeDataSignatureRef.current !== dataSignature) {
          transportModeDataSignatureRef.current = dataSignature;
          dispatch(setMasterRecords({
            masterName: 'transportmode',
            records: transportModeData
          }));
        }
      }
    }
  }, [schemaName, transportModeRecords?.data, dispatch]);

  const fields = schemaById?.data?.data?.fields || [];

  useEffect(() => {
    if (fields.length > 0) {
      const initialData: FieldData = {};
      fields.forEach((field: any) => {
        if (field.type === FieldTypes.Master && isMultipleRelationship(field.relationshipType)) {
          initialData[field.name] = [];
        } else if (field.type === FieldTypes.Boolean) {
          initialData[field.name] = false;
        } else {
          initialData[field.name] = '';
        }
      });
      setFormData(initialData);
    }
  }, [fields]);

  useEffect(() => {
    if (editMode && recordById?.data) {
      const recordData = recordById.data;
      const updatedData: FieldData = {};

      fields.forEach((field: any) => {
        const fieldValue = recordData[field.name]; 
        // Special handling for transportmode field in grade masters
        const isTransportModeInGrade = schemaName === 'grade' && 
           (field.name === 'transportmodeId' || 
           field.name === 'transportModeId' )
        let actualFieldValue = fieldValue;
        if (isTransportModeInGrade && (fieldValue === undefined || fieldValue === null)) {
          actualFieldValue = recordData['transportModeId'] || 
                           recordData['transportmodeId'] || 
                           recordData['transportmode'] || 
                           recordData['transportMode'];
        }
        if (actualFieldValue !== undefined && actualFieldValue !== null) {
          if (isMasterFieldWithMultipleValues(field)) {
            // For many-to-many relationships, handle array of objects with IDs
            if (Array.isArray(actualFieldValue)) {
              // Extract IDs from objects like [{ divisionId: "xk3U8uSx4S2rq0Td" }]
              updatedData[field.name] = actualFieldValue
                .map((item: any) => {
                  if (typeof item === 'object' && item !== null) {
                    if (isTransportModeInGrade) {
                      return item.transportModeId || item.transportmodeId || item.id || item._id;
                    }
                    // Try different possible ID field names
                    return (
                      item.divisionId ||
                      item[`${field.masterType}Id`] ||
                      item[`${field.name}Id`] ||
                      item.id ||
                      item._id
                    );
                  }
                  return item;
                })
                .filter(Boolean);
            } else {
              updatedData[field.name] = [actualFieldValue];
            }
          } else if (field.type === FieldTypes.Date) {
            updatedData[field.name] = formatDateFromApi(actualFieldValue);
          } else if (field.type === FieldTypes.Master) {
            updatedData[field.name] = typeof actualFieldValue === 'object' && actualFieldValue !== null
              ? (isTransportModeInGrade
                  ? actualFieldValue.transportModeId || actualFieldValue.transportmodeId || actualFieldValue.id || actualFieldValue._id || ''
                  : actualFieldValue[`${field.masterType}Id`] || actualFieldValue[`${field.name}Id`] || actualFieldValue.id || actualFieldValue._id || '')
              : actualFieldValue.toString();
          } else {
            updatedData[field.name] = actualFieldValue.toString();
          }
        }
      });

      setFormData((prev) => ({ ...prev, ...updatedData }));
    }
  }, [editMode, recordById?.data, fields]);

  const handleFieldChange = (
    fieldName: string,
    value: string | boolean | string[]
  ) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [fieldName]: value,
      } as FieldData;

      // Clear dependent master fields when their parent changes
      const dependents = fields.filter((f: any) => {
        if (f.type !== FieldTypes.Master) return false;
        if (!f.dependentType || !f.dependentName) return false;
        const parentFieldName = `${f.dependentName}Id`;
        return parentFieldName === fieldName;
      });

      dependents.forEach((dep: any) => {
        const isMultipleDep = isMultipleRelationship(dep.relationshipType);
        updated[dep.name] = isMultipleDep ? [] : '';
      });

      return updated;
    });
  };

  const handleSubmit = async () => {
    try {
      const payload: Record<string, any> = {};

      fields.forEach((field: any) => {
        const value = formData[field.name];
        
        // Always include boolean fields, even if they haven't been interacted with
        if (field.type === FieldTypes.Boolean) {
          payload[field.name] = value === true || value === 'true';
        } else if (value !== '' && value !== undefined && value !== null) {
          switch (field.type) {
            case FieldTypes.Number:
              payload[field.name] = Number(value);
              break;
            case FieldTypes.Date:
              // Convert dd-MM-yyyy format to yyyy-MM-dd for API submission
              payload[field.name] = formatDateForApi(value as string);
              break;
            case FieldTypes.Master:
              // Handle many-to-many, one-to-many, and many-to-one relationships
              if (isMultipleRelationship(field.relationshipType)) {
                // For multiple relationships, send array of strings directly
                if (Array.isArray(value)) {
                  payload[field.name] = value;
                } else {
                  payload[field.name] = value ? [value] : [];
                }
              } else {
                // For one-to-one, send single ID
                payload[field.name] = value;
              }
              break;
            default:
              payload[field.name] = value;
          }
        }
      });

      if (editMode) {
        toast.loading('Updating record...', { id: 'record-action' });
        await updateRecord.mutateAsync({
          data: payload,
          masterName: schemaName || '',
          recordId: editMode,
        });
        toast.success('Record updated successfully!', { id: 'record-action' });
      } else {
        toast.loading('Creating record...', { id: 'record-action' });
        await createRecord.mutateAsync({
          data: payload,
          masterName: schemaName || '',
        });
        toast.success('Record created successfully!', { id: 'record-action' });
      }

      router.push(`${NavKeys.MasterRecords}?schemaName=${schemaName}`);
    } catch (error) {
      // Prefer server-provided error message (e.g., duplicate data details)
      const err: any = error;
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.data?.message ||
        (Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(', ')
          : undefined) ||
        err?.message;

      const fallback = `Failed to ${editMode ? 'update' : 'create'} record.`;
      toast.error(apiMessage || fallback, { id: 'record-action' });
      console.error('Failed to create/update record:', error);
    }
  };

  const handleCancel = () => {
    router.push(`${NavKeys.MasterRecords}?schemaName=${schemaName}`);
  };

  const renderField = (field: any, index: number) => {
    const fieldName = field.name;
    const fieldValue = formData[fieldName];

    // Special handling for transportmode field in grade masters
    const isTransportModeInGrade = schemaName === 'grade' && 
      (fieldName === 'transportmode' || 
       fieldName === 'transportMode' || 
       fieldName === 'transportmodeId' || 
       fieldName === 'transportModeId' ||
       field.masterType === 'transportmode' ||
       field.masterType === 'transportMode');
    
    // If transportmode field is not configured as master type, treat it as master
    if (isTransportModeInGrade && field.type !== FieldTypes.Master) {
      field = {
        ...field,
        type: FieldTypes.Master,
        masterType: 'transportmode',
        relationshipType: 'manyToOne'
      };
    }

    // Build filters for dependent masters, e.g., district depends on state => { stateId: [selectedStateIds] }
    const buildDependentFilters = () => {
      const isDependentMaster =
        field.type === FieldTypes.Master &&
        field.dependentType === 'master' &&
        !!field.dependentName;
      if (!isDependentMaster) return undefined;

      const parentKey = `${field.dependentName}Id`;
      const parentValue = formData[parentKey as keyof FieldData];
      if (!parentValue || (Array.isArray(parentValue) && parentValue.length === 0)) {
        return undefined;
      }

      const ids = Array.isArray(parentValue) ? parentValue : [parentValue];
      return { [parentKey]: ids } as Record<string, string[]>;
    };

    const dependentFilters = buildDependentFilters();
    const isDependencySatisfied = !!dependentFilters;

    switch (field.type) {
      case FieldTypes.String:
        return (
          <div key={fieldName} className="space-y-2">
            <Label>{camelCaseToReadable(fieldName)}</Label>
            <Input
              placeholder={`Enter ${camelCaseToReadable(fieldName)}`}
              value={(fieldValue as string) || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            />
          </div>
        );

      case FieldTypes.Number:
        return (
          <div key={fieldName} className="space-y-2">
            <Label>{camelCaseToReadable(fieldName)}</Label>
            <Input
              type="number"
              placeholder={`Enter ${camelCaseToReadable(fieldName)}`}
              value={(fieldValue as string) || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            />
          </div>
        );

      case FieldTypes.Date:
        return (
          <div key={fieldName} className="space-y-2">
            <Label>{camelCaseToReadable(fieldName)}</Label>
            <DateInput
              value={(fieldValue as string) || ''}
              onChange={(value: string) => handleFieldChange(fieldName, value)}
              placeholder={`Select ${camelCaseToReadable(fieldName)}`}
            />
          </div>
        );

      case FieldTypes.Boolean:
        return (
          <div key={fieldName} className="flex flex-col justify-end space-y-2">
            <Switch
              checked={fieldValue === true || fieldValue === 'true'}
              onCheckedChange={(checked) =>
                handleFieldChange(fieldName, checked)
              }
              label={camelCaseToReadable(fieldName)}
            />
          </div>
        );

      case FieldTypes.Master:
        const isMultiple = isMultipleRelationship(field.relationshipType);
        
        // Handle transportmode field - try both 'transportmode' and 'transportMode' as masterName
        let masterNameForSelect = field.masterType;
        if (isTransportModeInGrade) {
          masterNameForSelect = 'transportmode'; // Use lowercase as it's the standard
        }
        
        console.log(
          'OPTIONS',
          field.type,
          field.masterType,
          isMultiple,
          field.relationshipType,
          masterNameForSelect
        );
        if (isMultiple) {
          return (
            <div key={fieldName} className="col-span-full space-y-2">
              <Label>{camelCaseToReadable(fieldName)}</Label>
              <MasterRecordMultiSelect
                masterName={masterNameForSelect}
                value={Array.isArray(fieldValue) ? fieldValue : []}
                onChange={(ids) => handleFieldChange(fieldName, ids)}
                placeholder={field.dependentType === 'master' && !isDependencySatisfied ? `Select ${camelCaseToReadable(`${field.dependentName}Id`)}` : `Select ${masterNameForSelect}`}
                maxToShow={999}
                hideSelectedOptions={true}
                filters={dependentFilters}
                enabled={field.dependentType === 'master' ? isDependencySatisfied : true}
              />
            </div>
          );
        } else {
          // Special label handling for transportmode in grade masters
          const labelText = isTransportModeInGrade 
            ? 'TransportMode' 
            : camelCaseToReadable(field.masterType || fieldName);
          
          // Special placeholder handling for transportmode in grade masters
          const placeholderText = isTransportModeInGrade
            ? 'Select TransportMode'
            : (field.dependentType === 'master' && !isDependencySatisfied 
                ? `Select ${camelCaseToReadable(`${field.dependentName}Id`)}` 
                : `Select ${masterNameForSelect}`);
          
          return (
            <div key={fieldName} className="space-y-2">
              <Label>{labelText}</Label>
              <MasterRecordSelect
                masterName={masterNameForSelect}
                value={(fieldValue as string) || ''}
                onChange={(value) => handleFieldChange(fieldName, value)}
                placeholder={placeholderText}
                className="w-full"
                filters={dependentFilters}
                enabled={field.dependentType === 'master' ? isDependencySatisfied : true}
              />
            </div>
          );
        }

      default:
        return null;
    }
  };

  if (
    groups.isLoading ||
    (editMode && recordById?.isLoading) ||
    schemaById?.isLoading
  ) {
    return <GenericPageLoading title="Loading Master Records" inline={true} />;
  }

  if (groups.error || (editMode && recordById?.error) || schemaById?.error) {
    return (
      <GenericPageError title="Error Loading Master Records" inline={true} />
    );
  }

  const isSubmitting = createRecord.isPending || updateRecord.isPending;

  return (
    <section className="space-y-4">
      <BreadcrumbHeader
        homeHref={`${NavKeys.MasterRecords}?schemaName=${schemaName}`}
        homeLabel="Master Records"
        backHref={`${NavKeys.MasterRecords}?schemaName=${schemaName}`}
        pageTitle={editMode ? 'Edit Record' : 'Create New Record'}
        subtitle={
          editMode
            ? 'Update record information'
            : 'Provide information to create a new record'
        }
        currentPage={editMode ? 'Edit Record' : 'Create Record'}
      />

      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Record Information
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fields.map((field: any, index: number) => renderField(field, index))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? editMode
              ? 'Updating...'
              : 'Creating...'
            : editMode
              ? 'Update Record'
              : 'Create Record'}
        </Button>
      </div>
    </section>
  );
};

export default MasterRecordsManagePage;
