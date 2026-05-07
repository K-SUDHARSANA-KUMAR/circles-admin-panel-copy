'use client';

import { useOutlets } from '@/features/dashboard/outlets/hooks/useOutlets';
import Loading from '@/components/ui/loading';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { getCloudFrontUrl } from '@/utils/common-utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import NavKeys from '@/constants/navkeys';

interface DuplicateOutlet {
  reasons: string[];
  outletId: string;
  outletCode?: string;
  outletName: string;
  phoneNumber: string;
  email?: string;
  ownerName: string;
  outletImages?: Array<{ s3Filename: string }>;
}

interface DuplicateOutletsCardProps {
  outletId: string;
}

export const DuplicateOutletsCard = ({ outletId }: DuplicateOutletsCardProps) => {
  const { getDuplicateOutlets } = useOutlets({ enabled: false });
  const duplicateQuery = getDuplicateOutlets(outletId);

  if (!outletId) {
    return null;
  }

  if (duplicateQuery.isLoading) {
    return (
      <div className="rounded-lg bg-card p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Duplicate Outlets
        </div>
        <div className="flex items-center justify-center py-8">
          <Loading text="Loading duplicate outlets..." />
        </div>
      </div>
    );
  }

  if (duplicateQuery.isError || !duplicateQuery.data?.data || duplicateQuery.data.data.length === 0) {
    return null;
  }

  const duplicateOutlets: DuplicateOutlet[] = duplicateQuery.data.data;

  // Calculate maximum number of reasons across all outlets
  const maxReasons = duplicateOutlets.reduce((max, outlet) => {
    const reasonCount = outlet.reasons?.length || 0;
    return Math.max(max, reasonCount);
  }, 0);

  // Calculate footer height based on maximum reasons
  // Title: ~18px, Each reason: ~20px, Padding: ~24px (py-3)
  const footerHeight = maxReasons > 0 ? Math.max(80, 42 + (maxReasons * 20)) : 80;

  return (
    <div className="rounded-lg bg-card p-4 w-full max-w-full overflow-x-hidden">
      <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        Duplicate Outlets
      </div>
      <div className="w-full max-w-full overflow-x-auto overflow-y-visible pb-2" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
        <div className="inline-flex gap-4 min-w-max">
          {duplicateOutlets.map((outlet) => (
            <div
              key={outlet.outletId}
              className="flex-shrink-0 w-[450px] rounded-lg border border-gray-200 bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              style={{ height: `${200 + footerHeight}px` }}
            >
              {/* Top Section - Image and Details - Fixed Height */}
              <div className="flex p-4 gap-4 relative" style={{ height: '200px' }}>
                {/* Left side - Outlet Image */}
                <div className="flex-shrink-0">
                  {outlet.outletImages && outlet.outletImages.length > 0 && outlet.outletImages[0]?.s3Filename ? (
                    <div className="w-28 h-28 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                      <img
                        src={getCloudFrontUrl(outlet.outletImages[0].s3Filename)}
                        alt={outlet.outletName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.image-placeholder')) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'image-placeholder w-full h-full flex items-center justify-center bg-gray-100';
                            placeholder.innerHTML = '<div class="text-gray-400 text-xs text-center px-2">No Image</div>';
                            parent.appendChild(placeholder);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <div className="text-gray-400 text-xs text-center px-2">
                        No Image
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right side - Details */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-foreground text-lg truncate">
                      {outlet.outletName}
                    </h3>
                    <div className="flex flex-col gap-1">
                      {outlet.outletCode && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">Code:</span>
                          <span className="text-sm text-muted-foreground font-medium">{outlet.outletCode}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">ID:</span>
                        <span className="text-xs text-gray-600 font-mono truncate">{outlet.outletId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-gray-100">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[50px]">Owner:</span>
                      <span className="text-sm text-muted-foreground truncate">{outlet.ownerName}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[50px]">Phone:</span>
                      <span className="text-sm text-muted-foreground">{outlet.phoneNumber}</span>
                    </div>
                    {outlet.email && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-500 min-w-[50px]">Email:</span>
                        <span className="text-sm text-muted-foreground truncate">{outlet.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow Button - Above footer, top-right */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        const url = `${NavKeys.OutletCreation}?mode=view&outletId=${outlet.outletId}`;
                        window.open(url, '_blank');
                      }}
                      className="absolute bottom-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 bg-card shadow-sm"
                      aria-label="View outlet details"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View outlet details</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Footer - Reasons - Fixed height based on max reasons, always at same position, fully filled yellow */}
              {outlet.reasons && outlet.reasons.length > 0 && (
                <div className="w-full bg-yellow-100 border-t-2 border-yellow-300" style={{ height: `${footerHeight}px` }}>
                  <div className="px-4 py-3 w-full h-full flex flex-col">
                    <p className="text-xs font-semibold text-yellow-900 mb-1.5 flex-shrink-0">
                      Reasons:
                    </p>
                    <div className="flex-1">
                      <ul className="space-y-1">
                        {outlet.reasons.map((reason, idx) => (
                          <li key={idx} className="text-sm text-yellow-800 flex items-center gap-2">
                            <span className="text-yellow-600 flex-shrink-0">•</span>
                            <span className="flex-1">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

