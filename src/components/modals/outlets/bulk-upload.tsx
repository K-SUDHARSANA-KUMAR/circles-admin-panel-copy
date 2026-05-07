'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogDescription } from '@radix-ui/react-dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Loading from '@/components/ui/loading';
import { PlusIcon, StoreIcon } from 'lucide-react';

const MAX_FILE_SIZE_MB = 10;
const BYTES_PER_MB = 1024 * 1024;

export default function BulkUpload({
  open,
  onOpenChange,
  onBulkUpload,
  isUploading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBulkUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    try {
      await onBulkUpload(selectedFile);
      toast.success('Outlets uploaded successfully');
      onOpenChange(false);
      setSelectedFile(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload outlets'
      );
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > MAX_FILE_SIZE_MB * BYTES_PER_MB) {
      toast.error(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setSelectedFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=" w-full max-w-[600px] overflow-y-auto">
        <div className="absolute top-6 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
          <StoreIcon className="text-primary" />
        </div>
        <DialogHeader className="pt-10 pb-0">
          <DialogTitle>Bulk Outlet Upload</DialogTitle>
          <DialogDescription>Add bulk outlets</DialogDescription>
        </DialogHeader>

        <div>
          {/* Step Section */}
          <div className="space-y-6">
            {/* Step 1: Download Sample Template */}
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary font-semibold text-white">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">
                  Step 1: Download Sample Template
                </h3>
              </div>
              <Button
                type="button"
                className="flex items-center gap-2 bg-primary px-6 py-2 text-white hover:bg-primary"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/outlets.xlsx';
                  link.download = 'outlets.xlsx';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Download
              </Button>
            </div>

            {/* Step 2: Upload CSV/XLS */}
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary font-semibold text-white">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">
                  Step 2: Upload CSV/XLS
                </h3>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="mt-6">
            <div className="w-full">
              <label className="text-sm font-medium text-foreground">
                Upload
              </label>
              <div className="relative mt-2">
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400">
                  {isUploading ? (
                    <Loading text="Uploading outlets..." className="py-4" />
                  ) : selectedFile ? (
                    <div className="flex items-center gap-2 pb-2">
                      <p className="text-sm font-medium text-foreground">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        ({(selectedFile.size / BYTES_PER_MB).toFixed(2)} MB)
                      </p>
                    </div>
                  ) : (
                    <p className="mb-6 text-sm text-gray-600">
                      Browse and chose CSV/XLS you want to upload from your
                      files
                    </p>
                  )}
                  {!isUploading && (
                    <Button
                      type="button"
                      size="icon"
                      className="flex h-10 w-10 items-center justify-center rounded bg-primary p-0 text-white hover:bg-primary"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.csv,.xls,.xlsx';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) {
                            handleFileSelection(file);
                          }
                        };
                        input.click();
                      }}
                      disabled={false}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2 pt-4">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 text-muted-foreground hover:bg-gray-50"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary text-white hover:bg-primary"
              onClick={handleConfirmUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Confirm'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
