'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { History, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface LogDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logData: any;
}

interface LogEntry {
  fieldName: string;
  previousValue: string;
  updatedValue: string;
}

export const LogDetailsModal = ({ open, onOpenChange, logData }: LogDetailsModalProps) => {
  if (!logData) return null;

  const formatValue = (value: any, fieldName?: string, fullState?: any): string => {
    if (value === null || value === undefined) return '-';
    
    // Format dates
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return format(new Date(value), 'dd MMM yyyy, hh:mm a');
    }
    
    // Format arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';
      
      // Handle mappings and mappingDetails array specially for pincodes
      if (fieldName === 'mappings' || fieldName === 'mappingDetails') {
        const pincodes = value
          .map((item: any) => item.pincode || item.pincodes)
          .filter((p: any) => p)
          .flat()
          .filter((p: any) => p);
        
        if (pincodes.length > 0) {
          return `Pincode: ${pincodes.join(' | ')}`;
        }
      }
      
      // Handle arrays of objects with IDs (like channel, division, zone, subZone)
      // Try to find corresponding Details array with names
      if (fieldName && fullState) {
        const detailsKey = `${fieldName}Details`;
        if (fullState[detailsKey] && Array.isArray(fullState[detailsKey])) {
          return fullState[detailsKey]
            .map((item: any) => {
              const nameKey = Object.keys(item).find(k => k.endsWith('Name'));
              return nameKey ? item[nameKey] : null;
            })
            .filter((v: any) => v)
            .join(' | ');
        }
      }
      
      return value
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            const displayKeys = Object.keys(item).filter(k => !k.endsWith('Id') && k !== 'location');
            return displayKeys.map(k => item[k]).filter(v => v).join(', ');
          }
          return String(item);
        })
        .filter(v => v)
        .join(' | ');
    }
    
    // Format objects
    if (typeof value === 'object') {
      const displayKeys = Object.keys(value).filter(k => !k.endsWith('Id') && k !== 'location' && k !== 'buffer' && k !== 'type' && k !== 'data');
      if (displayKeys.length === 0) return '-';
      
      return displayKeys
        .map(k => {
          const v = value[k];
          if (Array.isArray(v)) {
            return `${k}: [${v.join(', ')}]`;
          }
          if (typeof v === 'object' && v !== null) {
            return null;
          }
          return `${k}: ${v}`;
        })
        .filter(v => v !== null)
        .join(', ');
    }
    
    return String(value);
  };

  const formatFieldName = (fieldName: string): string => {
    if (fieldName.includes('Details.')) {
      const parts = fieldName.split('Details.');
      fieldName = parts[parts.length - 1];
    }
    
    if (fieldName.startsWith('address.')) {
      fieldName = fieldName.replace('address.', '');
    }
    
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const extractLogEntries = (): LogEntry[] => {
    const oldState = logData.oldState || logData.prevsState || {};
    const newState = logData.newState || {};
    const entries: LogEntry[] = [];

    const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);

    allKeys.forEach((key) => {
      // Skip system fields, IDs, sensitive data, and Details arrays
      // BUT keep mappingDetails for warehouse pincodes
      if ((key.endsWith('Id') || 
          (key.endsWith('Details') && key !== 'mappingDetails') ||
          key === '__v' ||
          key === 'auditId' ||
          key === '_id' ||
          key === 'password' ||
          key === 'userName' ||
          key === 'isDeleted' ||
          key === 'isActive' ||
          key === 'plantId' ||
          key === 'userId' ||
          key === 'createdAt' ||
          key === 'updatedAt')) {
        return;
      }

      const oldValue = oldState[key];
      const newValue = newState[key];

      const isNestedDetailsObject = (value: any) => {
        return (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          Object.keys(value).some(k => k.endsWith('Name') || k.endsWith('Id'))
        );
      };

      if (isNestedDetailsObject(oldValue) || isNestedDetailsObject(newValue)) {
        const oldObj = oldValue || {};
        const newObj = newValue || {};
        const allNestedKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
        
        allNestedKeys.forEach((nestedKey) => {
          // Skip system fields, IDs, and sensitive data in nested objects
          if (!nestedKey.endsWith('Id') && 
              nestedKey !== '__v' &&
              nestedKey !== 'auditId' &&
              nestedKey !== '_id' &&
              nestedKey !== 'password' &&
              nestedKey !== 'userName' &&
              nestedKey !== 'isDeleted' &&
              nestedKey !== 'isActive' &&
              nestedKey !== 'buffer' &&
              nestedKey !== 'type' &&
              nestedKey !== 'data' &&
              nestedKey !== 'createdAt' &&
              nestedKey !== 'updatedAt') {
            const prevVal = oldObj[nestedKey];
            const newVal = newObj[nestedKey];
            
            if (JSON.stringify(prevVal) !== JSON.stringify(newVal)) {
              entries.push({
                fieldName: `${key}.${nestedKey}`,
                previousValue: formatValue(prevVal, `${key}.${nestedKey}`, oldState),
                updatedValue: formatValue(newVal, `${key}.${nestedKey}`, newState),
              });
            }
          }
        });
      } else {
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          entries.push({
            fieldName: key,
            previousValue: formatValue(oldValue, key, oldState),
            updatedValue: formatValue(newValue, key, newState),
          });
        }
      }
    });

    return entries;
  };

  const logEntries = useMemo(() => extractLogEntries(), [logData]);

  const columns: ColumnDef<LogEntry>[] = useMemo(() => [
    {
      header: 'Title',
      accessorKey: 'fieldName',
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {formatFieldName(row.original.fieldName)}
        </span>
      ),
    },
    {
      header: 'Previous Entry',
      accessorKey: 'previousValue',
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.previousValue}
        </span>
      ),
    },
    {
      header: 'Updated Entry',
      accessorKey: 'updatedValue',
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.updatedValue}
        </span>
      ),
    },
  ], []);

  const getActionTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-foreground border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-[#C2FFE9] border-4 border-[#EAFFF7] rounded-full">
                  <History className="text-[#00A846] w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-foreground">Log Details</h2>
                    <Badge className={getActionTypeColor(logData.type)}>
                      {logData.type?.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">More details for the log.</p>
                  
                  {/* Metadata row */}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(logData.createdAt), 'dd MMM yyyy, hh:mm a')}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {logData.metaData?.updatedBy?.name || logData.metaData?.updatedBy || 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-auto">
            {logEntries.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No data changes recorded</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Only timestamp or system fields were updated
                  </p>
                </div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={logEntries}
                tableId="log-details-table"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};