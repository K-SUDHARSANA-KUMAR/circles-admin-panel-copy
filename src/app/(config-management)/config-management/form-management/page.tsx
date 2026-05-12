'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { columns } from '@/components/data-tables/form/columns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import GenericError from '@/components/ui/generic-error';
import Loading from '@/components/ui/loading';
import { SearchInput } from '@/components/ui/search-input';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import { PaginationState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useForms } from '@/features/config-management/form-management/hooks/useForms';
import NavKeys from '@/constants/navkeys';
import PageHeader from '@/components/shared/page-header';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const FormManagementPage = () => {
  return (
    <RequirePermission module={PERMISSIONS.FORM_MANAGEMENT}>
      <FormManagementContent />
    </RequirePermission>
  );
};

const FormManagementContent = () => {
  const formPermission = usePermissionChecker(PERMISSIONS.FORM_MANAGEMENT);
  const hasCreatePermission = formPermission.has(MENU_RIGHTS.CREATE);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  
  //Download
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [formToDownload, setFormToDownload] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch forms from API
  let paramsString = `?skip=${pagination.pageIndex * pagination.pageSize}&limit=${pagination.pageSize}`;
  if (searchQuery.trim() !== '') {
    paramsString += `&search=${encodeURIComponent(searchQuery)}`;
  }
  const { data, isLoading: isFormsLoading, isError } = useForms(paramsString);

  // Use API data directly
  const formData = data?.data?.items || [];

  // Action handler for row actions
  const handleEdit = useCallback(
    (form: any) => {
      router.push(
        `${NavKeys.ConfigFormCreation}?mode=edit&formId=${form.formId}`
      );
    },
    [router]
  );

  const handleDownload = useCallback((formId: string) => {
    const form = formData.find((f: any) => f.formId === formId);
    if (form) {
      setFormToDownload(form);
      setStartDate('');
      setEndDate('');
      setIsDownloadModalOpen(true);
    }
  }, [formData]);

  const handleConfirmDownload = useCallback(async () => {
    // Helper function to format date to YYYY-MM-DD
    const formatDateToYYYYMMDD = (dateString: string): string => {
      if (!dateString) return '';
      // Handle DD-MM-YYYY format from date input
      const parts = dateString.split('-');
      if (parts.length === 3) {
        // If it's DD-MM-YYYY, convert to YYYY-MM-DD
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
      // Otherwise, try to parse as normal date
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };

    // Format dates to ensure YYYY-MM-DD format
    const formattedStartDate = startDate ? formatDateToYYYYMMDD(startDate) : '';
    const formattedEndDate = endDate ? formatDateToYYYYMMDD(endDate) : '';

    // Validate dates only if both are provided (no toast, just return)
    if (formattedStartDate && formattedEndDate && new Date(formattedStartDate) > new Date(formattedEndDate)) {
      return;
    }
    
    // Always proceed with API call if form is selected
    if (!formToDownload) {
      return;
    }

    setIsDownloading(true);
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Always add dates - use provided dates or default to current date
      const finalStartDate = formattedStartDate || new Date().toISOString().split('T')[0];
      const finalEndDate = formattedEndDate || new Date().toISOString().split('T')[0];
      
      queryParams.append('startDate', finalStartDate);
      queryParams.append('endDate', finalEndDate);
      
      // Build the API URL
      const baseUrl = process.env.NEXT_PUBLIC_ACTIVITY_SERVICE_URL;
      const formNameForApi = formToDownload.formName;
      const endpoint = `${baseUrl}/activity-master/export/${formNameForApi}/data`;
      const apiUrl = `${endpoint}?${queryParams.toString()}`;
      
      // Make the API call and download the file
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Handle API response and extract error messages
      if (!response.ok) {
        let errorMessage = `API Error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || `API Error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // Get the blob data
      const blob = await response.blob();
      
      // Check if blob is empty or invalid
      if (!blob || blob.size === 0) {
        throw new Error('No data available for download. File is empty.');
      }
      
      // Check if blob type indicates an error (like JSON error response)
      if (blob.type === 'application/json' || blob.type.includes('text')) {
        // If it's JSON/text, it might be an error response
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          if (errorData.message) {
            throw new Error(errorData.message);
          }
        } catch (parseError) {
          // If it's not JSON but still text, it might be an error message
          if (text.includes('error') || text.includes('not found') || text.includes('no records')) {
            throw new Error(text);
          }
        }
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Set filename
      const fileName = `form-data-${formToDownload.displayName || formToDownload.formName}-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.download = fileName;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setIsDownloadModalOpen(false);
      setFormToDownload(null);
      setStartDate('');
      setEndDate('');
      
      // Success notification
      toast.success('Form data downloaded successfully!');
      
    } catch (error) {
      // Only show API error messages, no frontend errors
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsDownloading(false);
    }
  }, [formToDownload, startDate, endDate]);

  const handleCancelDownload = useCallback(() => {
    setIsDownloadModalOpen(false);
    setFormToDownload(null);
    setStartDate('');
    setEndDate('');
  }, []);

  // Table action handlers
  const handleTableEdit = useCallback((formId: string) => {
    const form = formData.find((f: any) => f.formId === formId);
    if (form) {
      handleEdit(form);
    }
  }, [formData, handleEdit]);

  // Memoize columns
  const tableColumns = useMemo(
    () => columns(pagination.pageIndex, pagination.pageSize, handleTableEdit, handleDownload),
    [pagination.pageIndex, pagination.pageSize, handleTableEdit, handleDownload]
  );

  const handleAddNew = () => {
    router.push(NavKeys.ConfigFormCreation);
  };

  if (isLoading || isFormsLoading) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title="Form Management" />

        <div className="w-full rounded-lg bg-card p-4">
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading forms..." />
          </div>
        </div>
      </section>
    );
  }

  if (error || isError) {
    return (
      <section className="w-full space-y-6">
        <PageHeader title="Form Management" />

        <div className="w-full rounded-lg bg-card p-4">
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading forms. Please try again." />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <PageHeader title="Form Management" />

      <div className="w-full space-y-4 rounded-lg bg-card p-4">
        <div className="flex flex-col justify-between gap-10 pb-4 md:flex-row">
          <div className="flex w-full flex-col gap-2 md:flex-row">
            <SearchInput
              placeholder="Search form name"
              className="md:w-full"
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <div className="flex items-center gap-2">
            {hasCreatePermission && (
              <Button onClick={handleAddNew}>New Form</Button>
            )}
          </div>
        </div>
        <DataTable
          columns={tableColumns}
          data={formData}
          initialPagination={pagination}
          onPaginationChange={setPagination}
          tableId="form-management-table"
        />
      </div>

      {/* Download Modal */}
      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Form Data</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                placeholder="Select end date"
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDownload}
              disabled={isDownloading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDownload}
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default FormManagementPage;