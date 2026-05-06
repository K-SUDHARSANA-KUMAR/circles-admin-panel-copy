'use client';

import Link from 'next/link';
import { ArrowLeftIcon, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { DataTable } from '@/components/ui/data-table';
import { useState, useMemo } from 'react';
import { getLogColumns } from '@/components/data-tables/logs/columns';
import { LogDetailsModal } from '@/components/modals/logs/view-log-modal';
import GenericPageLoading from '@/components/shared/generic-page-loading';
import GenericPageError from '@/components/shared/generic-page-error';
import EmptyState from '@/components/ui/empty-state';
import { useLogsData } from './hooks/useLogsData';
import { LogsComponentProps } from './types';
import { RequirePermission } from '@/components/auth/require-permission';

export const DynamicLogsComponent = ({ config, enabled = true }: LogsComponentProps) => {
  const { data: tableData, isLoading, error, items } = useLogsData({ config, enabled });

  const [open, setOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const handleViewLog = (log: any) => {
    setSelectedLog(log);
    setOpen(true);
  };

  const columns = useMemo(() => getLogColumns({ onViewLog: handleViewLog }), []);

  const content = (
    <section className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <Breadcrumb>
          <BreadcrumbList>
            {config.customBreadcrumbItems ? (
              <>
                {config.customBreadcrumbItems.map((item, index) => (
                  <div key={index}>
                    <BreadcrumbItem>
                      {item.isPage ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          href={item.href || '#'}
                          className="flex items-center gap-1"
                        >
                          {index === 0 && <Home className="h-3 w-3" />} {item.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < config.customBreadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                  </div>
                ))}
              </>
            ) : (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href={config.breadcrumbPath}
                    className="flex items-center gap-1"
                  >
                    <Home className="h-3 w-3" /> {config.breadcrumbLabel}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{config.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
       
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={config.backPath}
              className="hover:bg-freshleaf/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">{config.title}</h1>
              {config.description && (
                <p className="text-sm text-gray-500">{config.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white p-4">
        {isLoading ? (
          <GenericPageLoading 
            title={config.loadingTitle} 
            loadingText={config.loadingText} 
            inline 
          />
        ) : error ? (
          <GenericPageError 
            title={config.errorTitle} 
            errorText={config.errorText} 
            inline 
          />
        ) : items.length > 0 ? (
          <DataTable
            columns={columns}
            data={tableData}
            tableId={config.tableId}
          />
        ) : (
          <EmptyState text={config.emptyStateText} />
        )}
      </div>

      <LogDetailsModal 
        open={open} 
        onOpenChange={setOpen} 
        logData={selectedLog} 
      />
    </section>
  );

  // Wrap with permission check if module and action are provided
  if (config.module && config.action) {
    return (
      <RequirePermission module={config.module} action={config.action}>
        {content}
      </RequirePermission>
    );
  }

  return content;
};
