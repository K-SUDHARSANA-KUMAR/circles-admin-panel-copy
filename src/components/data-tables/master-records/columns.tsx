'use client'

import { ColumnDef } from "@tanstack/react-table"
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogHeader, DialogTitle, DialogTrigger,DialogClose,}from'@/components/ui/dialog'
import { Switch } from '@/components/ui/switch' // Assuming you have a custom or shadcn switch component
import { MoreVertical, History } from 'lucide-react'
import { camelCaseToReadable } from '@/utils/string-utils'
import { formatWithLeadingZero } from '@/lib/utils'
import { MasterRecord } from '@/features/master-managment/types/master.types'
import { format, isValid, parseISO } from 'date-fns'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  masterType?: string;
}

interface EnrichedRecord {
  id: string;
  [key: string]: any;
  onEdit: () => void;
  onViewLogs?: () => void;
  onDelete: () => void;
  onToggleActive?: (value: boolean) => void;
}

interface RecordMaps {
  [masterType: string]: Record<string, MasterRecord>;
}

// TruncatedText component with modal for viewing all data
const TruncatedText = ({ 
  text, 
  maxItems = 3, 
  separator = ', ',
  className = '' 
}: { 
  text: string; 
  maxItems?: number; 
  separator?: string;
  className?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Split by separator to handle comma-separated lists
  const items = text.split(separator).map(item => item.trim()).filter(Boolean);
  
  // Filter items based on search term
  const filteredItems = items.filter(item => 
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // If we have few items, return as simple text
  if (items.length <= maxItems) {
    return <span className={className}>{text}</span>;
  }

  const visibleItems = items.slice(0, maxItems);
  const hiddenCount = items.length - maxItems;
  
  return (
    <div className={className}>
      <span>{visibleItems.join(', ')}</span>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 ml-1 text-blue-600 hover:text-blue-800"
          >
            +{hiddenCount} more
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] sm:max-w-[425px] p-0">
          <DialogHeader className="sticky top-0 bg-white border-b p-6 pb-4 z-10 relative">
            <DialogTitle>All Items ({filteredItems.length} of {items.length} total)</DialogTitle>
            <DialogClose asChild>
              <button
                className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-green-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground p-1 rounded"
                aria-label="Close"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </DialogClose>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-6 pt-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search roles..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    {item}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No items found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const formatDateValue = (value: any): string => {
  if (!value) return '-';
  
  try {
    if (typeof value === 'string') {
      const date = parseISO(value);
      if (isValid(date)) {
        return format(date, 'dd/MM/yyyy');
      }
    }
    
    if (value instanceof Date && isValid(value)) {
      return format(value, 'MMM dd, yyyy');
    }
    
    if (typeof value === 'number') {
      const date = new Date(value);
      if (isValid(date)) {
        return format(date, 'MMM dd, yyyy');
      }
    }
    
    return String(value);
  } catch (error) {
    return String(value);
  }
};

export const generateColumns = (
  fields: SchemaField[], 
  currentPage: number = 0, 
  pageSize: number = 10,
  recordMaps?: RecordMaps,
  schemaName?: string | null
): ColumnDef<EnrichedRecord>[] => {
  const snoColumn: ColumnDef<EnrichedRecord> = {
    id: 'sno',
    header: 'S.No',
    cell: ({ row }) => formatWithLeadingZero(currentPage * pageSize + row.index + 1),
  };

  const normalColumns: ColumnDef<EnrichedRecord>[] = [];
  let isActiveColumn: ColumnDef<EnrichedRecord> | null = null;

  fields.forEach((field) => {
    if (field.name === "isActive") {
      isActiveColumn = {
        accessorKey: field.name,
        header: camelCaseToReadable(field.name),
        cell: ({ row }) => {
          const record = row.original;
          const isActive = Boolean(record[field.name]);

          return (
            <Switch
              checked={isActive}
              onCheckedChange={(value) => record.onToggleActive?.(value)}
            />
          );
        },
      };
    } else if (field.type === "boolean") {
      normalColumns.push({
        accessorKey: field.name,
        header: camelCaseToReadable(field.name),
        cell: ({ row }) => {
          const value = Boolean(row.getValue(field.name));
          return value ? "Active" : "Inactive";
        },
      });
    } else if (field.type === "date") {
      normalColumns.push({
        accessorKey: field.name,
        header: camelCaseToReadable(field.name),
        cell: ({ row }) => {
          const value = row.getValue(field.name);
          return formatDateValue(value);
        },
      });
    } else if (field.type === "master" && field.masterType) {
      const masterType = field.masterType;
      const displayField = `${masterType}Name`;
      
      // Special handling for transportmode field in grade masters
      const isTransportModeInGrade = schemaName === 'grade' && 
        (field.name === 'transportmode' || field.name === 'transportMode' || masterType === 'transportmode' || masterType === 'transportMode');
      
      normalColumns.push({
        accessorKey: field.name,
        header: camelCaseToReadable(field.masterType || field.name),
        cell: ({ row }) => {
          const fieldValue = row.getValue(field.name);
          
          // Handle many-to-many relationships (array of objects)
          if (Array.isArray(fieldValue)) {
            if (fieldValue.length === 0) return '-';
            
            // Extract IDs from objects like [{ divisionId: "xk3U8uSx4S2rq0Td" }]
            const ids = fieldValue.map((item: any) => {
              if (typeof item === 'object' && item !== null) {
                return item.divisionId || item[`${masterType}Id`] || item.id || item._id;
              }
              return item;
            }).filter(Boolean);
            
            // Special lookup for transportmode in grade masters
            if (isTransportModeInGrade) {
              const transportModeMap = recordMaps?.['transportmode'] || recordMaps?.['transportMode'];
              if (transportModeMap) {
                const names = ids.map((id: string) => {
                  const masterRecord = transportModeMap[id];
                  if (masterRecord && masterRecord['transportModeName' as keyof MasterRecord]) {
                    return String(masterRecord['transportModeName' as keyof MasterRecord]);
                  }
                  return id;
                });
                return <TruncatedText text={names.join(', ')} maxItems={3} />;
              }
            }
            
            if (recordMaps && recordMaps[masterType]) {
              const names = ids.map((id: string) => {
                const masterRecord = recordMaps[masterType][id];
                if (masterRecord && masterRecord[displayField as keyof MasterRecord]) {
                  return String(masterRecord[displayField as keyof MasterRecord]);
                }
                return id; // Fallback to ID if name not found
              });
              return <TruncatedText text={names.join(', ')} maxItems={3} />;
            }
            
            return <TruncatedText text={ids.join(', ')} maxItems={3} />;
          }
          
          // Handle single value (many-to-one relationship)
          // Special handling for transportmode in grade masters
          if (isTransportModeInGrade && fieldValue) {
            const transportModeMap = recordMaps?.['transportmode'] || recordMaps?.['transportMode'];
            if (transportModeMap) {
              const masterRecord = transportModeMap[fieldValue as string];
              if (masterRecord && masterRecord['transportModeName' as keyof MasterRecord]) {
                return String(masterRecord['transportModeName' as keyof MasterRecord]);
              }
            }
          }
          
          // Standard lookup for other master fields
          if (recordMaps && recordMaps[masterType] && fieldValue) {
            const masterRecord = recordMaps[masterType][fieldValue as string];
            if (masterRecord && masterRecord[displayField as keyof MasterRecord]) {
              return String(masterRecord[displayField as keyof MasterRecord]);
            }
          }
          
          return fieldValue ? String(fieldValue) : '-';
        },
      });
    } else {
      normalColumns.push({
        accessorKey: field.name,
        header: camelCaseToReadable(field.name),
        cell: ({ row }) => {
          const value = row.getValue(field.name);
          
          // Check if this is a date field by common naming patterns
          const isDateField = field.name.toLowerCase().includes('date') || 
                             field.name.toLowerCase().includes('time') ||
                             field.name.toLowerCase().includes('created') ||
                             field.name.toLowerCase().includes('updated');
          
          if (isDateField && value) {
            return formatDateValue(value);
          }
          
          const stringValue = value ? String(value) : '-';
          
          // Apply truncation for long text (more than 50 characters)
          if (stringValue.length > 50) {
            return <TruncatedText text={stringValue} maxItems={3} />;
          }
          
          return stringValue;
        },
      });
    }
  });
  const actionColumn: ColumnDef<EnrichedRecord> = {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const record = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => record.onEdit?.()}>
              Edit
            </DropdownMenuItem>
            {record.onViewLogs && (
              <DropdownMenuItem onClick={() => record.onViewLogs?.()}>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Logs
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  return [snoColumn, ...normalColumns, ...(isActiveColumn ? [isActiveColumn] : []), actionColumn];
};
