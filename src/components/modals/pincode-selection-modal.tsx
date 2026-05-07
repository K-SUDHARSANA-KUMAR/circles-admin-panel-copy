'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { DataTable } from '@/components/ui/data-table';
import { createPincodeColumns } from '@/components/data-tables/warehouse/pincode-columns';
import GenericError from '@/components/ui/generic-error';
import { usePincode } from '@/features/warehouse-managment/hooks/usePincode';
import { PaginationState } from '@tanstack/react-table';
import { MasterRecord } from '@/features/master-managment/types/master.types';

interface PincodeSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPincodes: string[];
  onConfirm: (pincodes: string[]) => void;
  channelId?: string;
}

const PincodeSelectionModal = ({
  open,
  onOpenChange,
  selectedPincodes,
  onConfirm,
  channelId,
}: PincodeSelectionModalProps) => {
  // Local state for modal
  const [modalSelectedPincodes, setModalSelectedPincodes] = useState<string[]>([]);
  const [modalSelectedState, setModalSelectedState] = useState<string>('');
  const [modalSelectedDistrict, setModalSelectedDistrict] = useState<string>('');
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [debouncedModalSearchQuery, setDebouncedModalSearchQuery] = useState<string>('');
  
  // Modal pincode data state
  const [modalPincodeData, setModalPincodeData] = useState<any[]>([]);
  const [modalPincodeLoading, setModalPincodeLoading] = useState(false);
  const [modalPincodeError, setModalPincodeError] = useState<string | null>(null);
  const [modalPincodePagination, setModalPincodePagination] = useState<{
    totalPages: number;
    totalItems: number;
  }>({ totalPages: 0, totalItems: 0 });
  const [pincodeTablePagination, setPincodeTablePagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const { getUnmappedPincodes } = usePincode();

  // Initialize modal selected pincodes when modal opens
  useEffect(() => {
    if (open) {
      setModalSelectedPincodes([...selectedPincodes]);
    }
  }, [open, selectedPincodes]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedModalSearchQuery(modalSearchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [modalSearchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    if (open) {
      setPincodeTablePagination(prev => ({ ...prev, pageIndex: 0 }));
    }
  }, [open, modalSelectedState, modalSelectedDistrict, debouncedModalSearchQuery]);

  // Fetch unmapped pincodes when filters change
  useEffect(() => {
    if (!open || !channelId) return;

    const fetchUnmappedPincodes = async () => {
      // Cancel any ongoing API call
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setModalPincodeLoading(true);
      setModalPincodeError(null);

      const skip = pincodeTablePagination.pageIndex * pincodeTablePagination.pageSize;
      const limit = pincodeTablePagination.pageSize;

      try {
        const response = await getUnmappedPincodes.mutateAsync({
          pincodes: modalSelectedPincodes, // Pass selected pincodes to exclude them from results
          skip,
          limit,
          channelId,
          stateId: modalSelectedState || undefined,
          districtId: modalSelectedDistrict || undefined,
          search: debouncedModalSearchQuery || undefined,
          signal: abortController.signal,
        });

        // Check if the request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        setModalPincodeData(response.data.items || []);
        setModalPincodePagination({
          totalPages: response.data.totalPages || 0,
          totalItems: response.data.totalItems || 0,
        });
      } catch (error: any) {
        // Don't set error state if the request was aborted
        if (error.name !== 'AbortError') {
          console.error('Error fetching unmapped pincodes:', error);
          setModalPincodeError(error.message || 'Failed to load pincodes');
        }
      } finally {
        // Only update loading state if the request wasn't aborted
        if (!abortController.signal.aborted) {
          setModalPincodeLoading(false);
        }
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    };

    // Add a small delay to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchUnmappedPincodes();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    open,
    channelId,
    modalSelectedState,
    modalSelectedDistrict,
    debouncedModalSearchQuery,
    pincodeTablePagination,
    // Removed modalSelectedPincodes from dependencies to prevent reload on selection
  ]);

  const handleModalStateChange = (value: string) => {
    setModalSelectedState(value);
    setModalSelectedDistrict('');
  };

  const handleModalDistrictChange = (value: string) => {
    setModalSelectedDistrict(value);
  };

  const handlePincodeTablePaginationChange = (newPagination: PaginationState) => {
    // If page size changes, reset to first page
    if (newPagination.pageSize !== pincodeTablePagination.pageSize) {
      setPincodeTablePagination({
        ...newPagination,
        pageIndex: 0,
      });
    } else {
      setPincodeTablePagination(newPagination);
    }
    // The main useEffect will handle the API call when pagination changes
  };

  const handleModalPincodeSelect = (pincode?: string, isSelected?: boolean) => {
    if (!pincode) return;

    setModalSelectedPincodes(prev => {
      const newSelection = isSelected 
        ? [...prev, pincode]
        : prev.filter(p => p !== pincode);
      
      // Note: We don't trigger a reload here anymore to prevent the reload issue
      // The selected pincodes will still be excluded from future API calls
      return newSelection;
    });
  };

  const handleCloseModal = () => {
    // Cancel any ongoing API call when closing modal
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setModalSelectedPincodes([]);
    setModalSelectedState('');
    setModalSelectedDistrict('');
    setModalSearchQuery('');
    setDebouncedModalSearchQuery('');
    setModalPincodeData([]);
    setModalPincodeError(null);
    setModalPincodePagination({ totalPages: 0, totalItems: 0 });
    setPincodeTablePagination({ pageIndex: 0, pageSize: 10 });
    
    onOpenChange(false);
  };

  const handleConfirmSelection = () => {
    onConfirm([...modalSelectedPincodes]);
    handleCloseModal();
  };

  const modalPincodeColumns = createPincodeColumns(
    pincodeTablePagination.pageIndex,
    pincodeTablePagination.pageSize,
    modalSelectedPincodes,
    handleModalPincodeSelect
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-6xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Select Pincodes</DialogTitle>
        </DialogHeader>

        {/* Modal Content - Scrollable Area */}
        <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
          {/* Filters Section */}
          <div className="flex-shrink-0 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <MasterRecordDropdown
                  masterName="state"
                  value={modalSelectedState}
                  onChange={handleModalStateChange}
                  placeholder="Filter by state"
                  className="w-full"
                />
              </div>
              <div>
                <MasterRecordDropdown
                  masterName="district"
                  value={modalSelectedDistrict}
                  onChange={handleModalDistrictChange}
                  placeholder={
                    !modalSelectedState
                      ? 'Filter by state first'
                      : 'Filter by district'
                  }
                  className="w-full"
                  filters={{ stateId: modalSelectedState }}
                  disabled={!modalSelectedState || modalPincodeLoading}
                />
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search Pincodes or Areas"
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Pincodes Summary */}
            {modalSelectedPincodes.length > 0 && (
              <div className="text-sm text-gray-600">
                Mapped pincodes: {modalSelectedPincodes.length}
              </div>
            )}
          </div>

          {/* Table Section - Flexible Height */}
          <div className="mt-4 min-h-0 flex-1">
            {modalPincodeError ? (
              <div className="flex h-full items-center justify-center">
                <GenericError text="Error loading pincodes. Please try again." />
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <DataTable
                  columns={modalPincodeColumns}
                  data={modalPincodeData || []}
                  pageCount={modalPincodePagination.totalPages}
                  totalItems={modalPincodePagination.totalItems}
                  onPaginationChange={handlePincodeTablePaginationChange}
                  manualPagination={true}
                  initialPagination={pincodeTablePagination}
                  isLoading={modalPincodeLoading}
                  loadingText="Loading Pincodes..."
                  tableId="pincode-selection-table"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions - Fixed at Bottom */}
        <div className="flex justify-end gap-2 border-t bg-card px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseModal}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirmSelection}>
            Confirm Selection ({modalSelectedPincodes.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PincodeSelectionModal;
