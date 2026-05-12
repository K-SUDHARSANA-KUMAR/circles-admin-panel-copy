'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useOutlets,
  Outlet,
} from '@/features/dashboard/outlets/hooks/useOutlets';
import { MapPin, Store, Phone, Check, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import EmptyState from '@/components/ui/empty-state';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';

interface OutletSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOutletSelect: (outlet: { 
    outletId: string; 
    outletName: string; 
    outletStatus: 'active' | 'inactive' | 'pending' | 'suspended';
    ownerName?: string;
    ownerPhoneNumber?: string;
  }) => void;
  selectedOutletId?: string;
  warehouseId?: string;
  outletType?: string;
}

export const OutletSelectorModal = ({
  open,
  onOpenChange,
  onOutletSelect,
  selectedOutletId,
  warehouseId,
  outletType,
}: OutletSelectorModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastSearchTerm, setLastSearchTerm] = useState('');
  const [isIntentionalLoad, setIsIntentionalLoad] = useState(false);
  const limit = 20;

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Debug logging
  console.log('OutletSelectorModal - outletType prop:', outletType);
  
  const { outlets } = useOutlets({
    search: searchTerm,
    warehouseId,
    skip: currentPage * limit,
    limit,
    enabled: open,
    outletType: outletType,
  });

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedOutlet(null);
      setCurrentPage(0);
      setAllOutlets([]);
      setHasMore(true);
      setIsLoadingMore(false);
      setLastSearchTerm('');
      setIsIntentionalLoad(false);
    }
  }, [open]);

  useEffect(() => {
    if (lastSearchTerm !== searchTerm) {
      setCurrentPage(0);
      setAllOutlets([]);
      setHasMore(true);
      setIsLoadingMore(false);
      setIsIntentionalLoad(false);
      setLastSearchTerm(searchTerm);
    }
  }, [searchTerm, warehouseId, lastSearchTerm]);

  useEffect(() => {
    if (outlets.data?.data?.items && !outlets.isLoading) {
      const newOutlets = outlets.data.data.items;
      const totalPages = outlets.data.data.totalPages;

      setHasMore(currentPage + 1 < totalPages);
      setIsLoadingMore(false);
      setIsIntentionalLoad(false);

      if (currentPage === 0) {
        setAllOutlets(newOutlets);
      } else if (isIntentionalLoad && newOutlets.length > 0) {
        setAllOutlets((prev) => {
          const existingIds = new Set(prev.map((outlet) => outlet._id));
          const uniqueNewOutlets = newOutlets.filter(
            (outlet) => !existingIds.has(outlet._id)
          );

          if (uniqueNewOutlets.length > 0) {
            return [...prev, ...uniqueNewOutlets];
          } else {
            return prev;
          }
        });
      }
    }
  }, [outlets.data, outlets.isLoading]);

  useEffect(() => {
    if (inView && hasMore && !outlets.isLoading && !isLoadingMore) {
      const timer = setTimeout(() => {
        setIsLoadingMore(true);
        setIsIntentionalLoad(true);
        setCurrentPage((prev) => prev + 1);
      }, 50); // Reduced delay for faster response

      return () => clearTimeout(timer);
    }
  }, [inView, hasMore, outlets.isLoading, isLoadingMore, currentPage]);

  const handleOutletSelect = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
  };

  const handleConfirmSelection = () => {
    if (selectedOutlet) {
      onOutletSelect({
        outletId: selectedOutlet.outletId,
        outletName: selectedOutlet.outletName,
        outletStatus: selectedOutlet.outletStatus,
        ownerName: selectedOutlet.outletName, // Using outlet name as owner name for now
        ownerPhoneNumber: selectedOutlet.phoneNumber,
      });
      onOpenChange(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };
  const totalPages = outlets.data?.data?.totalPages || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            <div className="flex flex-col gap-1">
              <div className="bg-primary/10 w-fit rounded-full p-2">
                <Store className="text-primary h-5 w-5" />
              </div>
              <div className="text-lg font-medium">Select Outlet</div>
              <div className="text-sm font-normal text-zinc-500">
                Choose an outlet for this order
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-shrink-0">
          <SearchInput
            placeholder="Search outlets by name, phone, or address..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>

        <div className="relative flex-1 space-y-4 min-h-0">
          {/* Outlets List */}
          <ScrollArea className="h-full w-full">
            {outlets.isLoading && allOutlets.length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <Loading text="Loading outlets..." />
              </div>
            ) : outlets.isError ? (
              <div className="flex h-40 items-center justify-center">
                <GenericError />
              </div>
            ) : allOutlets.length === 0 && !outlets.isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <EmptyState />
              </div>
            ) : (
              <div className="space-y-2">
                {allOutlets.map((outlet: Outlet) => (
                  <div
                    key={outlet.outletId}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      selectedOutlet?.outletId === outlet.outletId
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                    onClick={() => handleOutletSelect(outlet)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-sm font-medium">
                            {outlet.outletName}
                          </h3>
                          {renderStatusBadge(
                            outlet.outletStatus || 'Not Set',
                            StatusType.OUTLET
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone className="h-3 w-3" />
                            <span>{outlet.phoneNumber}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">
                              {outlet.outletAddress?.streetAddress ||
                                'No address available'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {outlet.pincode && (
                          <div className="text-xs text-gray-500">
                            PIN: {outlet.pincode}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {(hasMore || outlets.isLoading) && allOutlets.length > 0 && (
                  <div
                    ref={sentinelRef}
                    className="flex min-h-[60px] items-center justify-center pt-4"
                  >
                    {(isLoadingMore || outlets.isLoading) && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading more outlets...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-white"></div>
        </div>

        <DialogFooter className="flex-shrink-0 flex items-center justify-between border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button 
            onClick={handleConfirmSelection} 
            disabled={!selectedOutlet}
            className={!selectedOutlet ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Select Outlet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
