'use client'

import { ColumnDef } from "@tanstack/react-table"
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch' // Assuming you have a custom or shadcn switch component
import { MoreVertical } from 'lucide-react'
import { camelCaseToReadable } from '@/utils/string-utils'
import { formatWithLeadingZero } from '@/lib/utils'
import { MasterRecord } from '@/features/master-managment/types/master.types'
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
  onDelete: () => void;
  onToggleActive?: (value: boolean) => void;
}

interface RecordMaps {
  [masterType: string]: Record<string, MasterRecord>;
}

export const generateColumns = (
  fields: SchemaField[], 
  currentPage: number = 0, 
  pageSize: number = 10,
  recordMaps?: RecordMaps
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
    } else if (field.type === "master" && field.masterType) {
      const masterType = field.masterType;
      const displayField = `${masterType}Name`;
      
      normalColumns.push({
        accessorKey: field.name,
        header: camelCaseToReadable(field.name),
        cell: ({ row }) => {
          const fieldValue = row.getValue(field.name) as string;
          
          if (recordMaps && recordMaps[masterType] && fieldValue) {
            const masterRecord = recordMaps[masterType][fieldValue];
            if (masterRecord && masterRecord[displayField as keyof MasterRecord]) {
              return String(masterRecord[displayField as keyof MasterRecord]);
            }
          }
          
          return fieldValue || '-';
        },
      });
    } else {
      normalColumns.push({
        accessorKey: field.name,
        header: camelCaseToReadable(field.name),
        cell: ({ row }) => {
          const value = row.getValue(field.name);
          return value ? String(value) : '-';
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
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };

  return [snoColumn, ...normalColumns, ...(isActiveColumn ? [isActiveColumn] : []), actionColumn];
};
