import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ApprovalHierarchyRow {
  sno: number;
  _id: string;
  context: string;
  metaTagFields: Record<string, any>;
  approversCount: number;
  hierarchyId: string;
}

// Meta field configurations for each hierarchy type
const getMetaFieldsForType = (type: string) => {
  switch (type) {
    case 'claimApprovals':
      return [
        { key: 'divisionId', label: 'Division Name', masterName: 'division' },
        { key: 'channelId', label: 'Channel Name', masterName: 'channel' },
        { key: 'claimTypeId', label: 'Claim Type', masterName: 'claimType' },
        { key: 'roleId', label: 'Role', masterName: 'role' },
      ];
    case 'outletApprovals':
      return [
        { key: 'divisionId', label: 'Division Name', masterName: 'division' },
        { key: 'channelId', label: 'Channel Name', masterName: 'channel' },
        { key: 'paymentModeId', label: 'Payment Mode', masterName: 'paymentMode' },
      ];
    case 'schemeApprovals':
      return [
        { key: 'divisionId', label: 'Division Name', masterName: 'division' },
        { key: 'channelId', label: 'Channel Name', masterName: 'channel' },
      ];
    case 'manualPjpApprovals':
      return [
        { key: 'divisionId', label: 'Division Name', masterName: 'division' },
        { key: 'channelId', label: 'Channel Name', masterName: 'channel' },
      ];
    default:
      return [];
  }
};

export const createApprovalHierarchyColumns = (
  selectedContext: string,
  onUpdate: (row: ApprovalHierarchyRow) => void,
  onDelete: (row: ApprovalHierarchyRow) => void,
  onViewLogs: (row: ApprovalHierarchyRow) => void,
  canEdit: boolean = true,
  canDelete: boolean = true,
  canViewLogs: boolean = true,
  divisionMap: Map<string, string> = new Map(),
  paymentModeMap: Map<string, string> = new Map()
): ColumnDef<ApprovalHierarchyRow>[] => {
  const baseColumns: ColumnDef<ApprovalHierarchyRow>[] = [
    {
      header: 'S.No',
      accessorKey: 'sno',
      cell: info => info.row.index + 1,
      size: 60,
    },
    {
      header: 'Context',
      accessorKey: 'context',
      cell: ({ row }) => {
        const context = row.getValue('context') as string;
        const contextLabels: Record<string, string> = {
          claimApprovals: 'Claim Approvals',
          outletApprovals: 'Outlet Approvals',
          schemeApprovals: 'Scheme Approvals',
          manualPjpApprovals: 'Manual PJP Approvals',
        };
        return contextLabels[context] || context;
      },
    },
    {
      header: 'Approvers',
      accessorKey: 'approversCount',
      cell: ({ row }) => `${row.getValue('approversCount')} levels`,
    },
  ];

  // Add dynamic columns based on selected context using getMetaFieldsForType
  const dynamicColumns: ColumnDef<ApprovalHierarchyRow>[] = [];

  if (selectedContext && selectedContext !== 'all') {
    const metaFields = getMetaFieldsForType(selectedContext);
    
    metaFields.forEach((field) => {
      dynamicColumns.push({
        header: field.label,
        id: field.key,
        cell: ({ row }) => {
          // Try to get the display name from metaTagFields
          const metaFields = row.original.metaTagFields || {};
          
          // For division, map divisionId to divisionName
          if (field.key === 'divisionId') {
            const divisionId = metaFields.divisionId;
            const divisionName = divisionMap.get(divisionId);
            return divisionId ? (divisionName || divisionId) : '-';
          }
          
          // For payment mode, map paymentModeId to paymentModeName
          if (field.key === 'paymentModeId') {
            const paymentModeId = metaFields.paymentModeId;
            const paymentModeName = paymentModeMap.get(paymentModeId);
            return paymentModeId ? (paymentModeName || paymentModeId) : '-';
          }
          
          // For other fields, show the name if present; else fallback to id
          const displayName = metaFields[`${field.masterName}Name`] || 
                             metaFields[field.key] || 
                             '-';
          return displayName;
        },
      });
    });
  }

  const actionColumn: ColumnDef<ApprovalHierarchyRow> = {
    header: 'Actions',
    id: 'actions',
    cell: ({ row }) => {
      const data = row.original;
      
      // Check if any action is available
      const hasAnyAction = canEdit || canDelete || canViewLogs;
      
      if (!hasAnyAction) {
        return null;
      }
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={() => onUpdate(data)}>
                Update
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem onClick={() => onDelete(data)}>
                Delete
              </DropdownMenuItem>
            )}
            {canViewLogs && (
              <DropdownMenuItem onClick={() => onViewLogs(data)}>
                View Logs
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 100,
  };

  // Reorder columns: Division Name, Channel Name, Context, Approvers
  const reorderedColumns = [
    baseColumns[0], // S.No
    ...dynamicColumns, // Division Name, Channel Name
    baseColumns[1], // Context
    baseColumns[2], // Approvers
    actionColumn // Actions
  ];
  
  return reorderedColumns;
};
