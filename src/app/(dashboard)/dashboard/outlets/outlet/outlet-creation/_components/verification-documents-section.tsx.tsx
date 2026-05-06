"use client";

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/ui/empty-state';
import { ImageUploadField } from '@/components/image-upload/image-upload';
import { FormSelect } from '@/components/form/form-select';
import { renderStatusBadge, StatusType } from '@/utils/badge-utils';
import { getCloudFrontUrl, validateDocument } from '@/utils/common-utils';
import { MoreVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const documentTypeOptions = [
  { label: 'PAN', value: 'PAN' },
  { label: 'GST', value: 'GST' },
];

type Props = {
  form: any;
  isEditMode: boolean;
  handleStatusUpdate: (index: number, status: 'verified' | 'unverified' | 'invalid') => Promise<void> | void;
  uploadMultipleFiles: { mutateAsync: (args: { files: File[]; folder?: string }) => Promise<string[]>; isPending: boolean };
  outletId?: string;
  onViewLogs?: (verificationDocumentId: string) => void;
  onBillingAddressUpdate?: (addressData: any) => void;
  onShippingAddressUpdate?: (addressData: any) => void;
};

export const VerificationDocumentsSection = ({ form, isEditMode, handleStatusUpdate, uploadMultipleFiles, outletId, onViewLogs, onBillingAddressUpdate, onShippingAddressUpdate }: Props) => {
  const [showAttestrModal, setShowAttestrModal] = useState(false);
  const [attestrData, setAttestrData] = useState<any>(null);
  const [documentType, setDocumentType] = useState<string>('');

  const handleShowAttestrDetails = (data: any, docType: string) => {
    setAttestrData(data);
    setDocumentType(docType);
    setShowAttestrModal(true);
  };

  return (
    <div className="rounded-lg bg-white p-4">
      <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">Tax Verification Documents</div>
      <FormField
        control={form.control}
        name="verificationDocuments"
        render={({ field }) => (
          <FormItem>
            <div>
              {Array.isArray(field.value) && field.value.length > 0 ? (
                field.value.map((doc: any, idx: number) => (
                  <div key={idx} className="mb-20 space-y-4">
                    <div className="flex w-full flex-col items-end gap-4 md:flex-row">
                      <div className="flex-1">
                        <div>
                          <div className="flex items-center justify-between">
                            <FormLabel>Type</FormLabel>
                            <FormField
                              control={form.control}
                              name={`verificationDocuments.${idx}.verificationStatus`}
                              render={({ field: docField }) => (
                                <div>{renderStatusBadge(docField.value || 'Not Set', StatusType.VERIFICATION)}</div>
                              )}
                            />
                          </div>
                          <FormSelect
                            control={form.control}
                            name={`verificationDocuments.${idx}.documentType`}
                            label=""
                            placeholder="Select type"
                            options={documentTypeOptions}
                            onChange={(value) => {
                              form.clearErrors(`verificationDocuments.${idx}.value`);
                              const currentValue = form.getValues(`verificationDocuments.${idx}.value`);
                              if (currentValue && value) {
                                const validation = validateDocument(value, currentValue);
                                if (!validation.isValid) {
                                  form.setError(`verificationDocuments.${idx}.value`, { type: 'manual', message: validation.message });
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`verificationDocuments.${idx}.value`}
                          render={({ field: docField }) => (
                            <FormItem>
                              <FormLabel>Document No</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={(() => {
                                    const docType = form.getValues(`verificationDocuments.${idx}.documentType`);
                                    switch (docType) {
                                      case 'PAN':
                                        return 'Enter PAN (e.g., ABCDE1234F)';
                                      case 'GST':
                                        return 'Enter GST (e.g., 22AAAAA0000A1Z5)';
                                      default:
                                        return 'Enter document number';
                                    }
                                  })()}
                                  {...docField}
                                  onChange={(e) => {
                                    const uppercaseValue = e.target.value.toUpperCase();
                                    docField.onChange(uppercaseValue);
                                  }}
                                  onBlur={(e) => {
                                    docField.onBlur();
                                    const documentType = form.getValues(`verificationDocuments.${idx}.documentType`);
                                    const value = e.target.value;
                                    if (documentType && value) {
                                      const validation = validateDocument(documentType, value);
                                      if (!validation.isValid) {
                                        form.setError(`verificationDocuments.${idx}.value`, { type: 'manual', message: validation.message });
                                      } else {
                                        form.clearErrors(`verificationDocuments.${idx}.value`);
                                      }
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-6">
                      <div className="flex-1">
                        <ImageUploadField
                          name={`verificationDocuments.${idx}.documentImages`}
                          label="Document Images *"
                          multiple
                          maxImages={3}
                          placeholder="Upload document images - Click or drag and drop (max 3 images)"
                          aspectRatio="auto"
                          fixedHeight="h-48"
                          value={(() => {
                            const documentImages = form.getValues(`verificationDocuments.${idx}.documentImages`);
                            return documentImages?.map((img: any) => getCloudFrontUrl(img.s3Filename)) || [];
                          })()}
                          onChange={async (files) => {
                            try {
                              const s3FileNames = await uploadMultipleFiles.mutateAsync({ files, folder: 'documentimages' });
                              const currentDocs = form.getValues('verificationDocuments') || [];
                              const updatedDocs = [...currentDocs];
                              const existingImages = updatedDocs[idx]?.documentImages || [];
                              updatedDocs[idx] = {
                                ...updatedDocs[idx],
                                documentImages: [
                                  ...existingImages,
                                  ...s3FileNames.map((s3FileName) => ({ s3Filename: s3FileName })),
                                ],
                              };
                              form.setValue('verificationDocuments', updatedDocs);
                              toast.success('Document images uploaded successfully!');
                            } catch (error: any) {
                              console.error('Failed to upload document images:', error);
                              toast.error(error?.message || 'Failed to upload document images. Please try again.');
                            }
                          }}
                          onRemove={(imageIndex) => {
                            const currentDocs = form.getValues('verificationDocuments') || [];
                            const updatedDocs = [...currentDocs];
                            const existingImages = Array.isArray(updatedDocs[idx]?.documentImages)
                              ? [...updatedDocs[idx].documentImages]
                              : [];
                            if (imageIndex >= 0 && imageIndex < existingImages.length) {
                              existingImages.splice(imageIndex, 1);
                            }
                            updatedDocs[idx] = { ...updatedDocs[idx], documentImages: existingImages };
                            form.setValue('verificationDocuments', updatedDocs);
                          }}
                        />
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(() => {
                              const currentStatus = form.getValues(`verificationDocuments.${idx}.verificationStatus`);
                              return (
                                <>
                                  {isEditMode && (
                                    <>
                                      {currentStatus === 'verified' ? (
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(idx, 'invalid')} disabled={uploadMultipleFiles.isPending}>
                                          Mark as Invalid
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(idx, 'verified')} disabled={uploadMultipleFiles.isPending}>
                                          Mark as Verified
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      // Try to get verificationDocumentId first, then fallback to _id
                                      const verificationDocumentId = form.getValues(`verificationDocuments.${idx}.verificationDocumentId`) ||
                                        form.getValues(`verificationDocuments.${idx}._id`);

                                      if (verificationDocumentId && onViewLogs) {
                                        onViewLogs(verificationDocumentId);
                                      } else {
                                        // Fallback: use documentType and value combination
                                        const documentType = form.getValues(`verificationDocuments.${idx}.documentType`);
                                        const value = form.getValues(`verificationDocuments.${idx}.value`);

                                        if (documentType && value && onViewLogs) {
                                          const fallbackId = `${documentType}_${value}`;
                                          onViewLogs(fallbackId);
                                        } else {
                                          toast.error('Verification document ID not found');
                                        }
                                      }
                                    }}
                                  >
                                    Logs
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleShowAttestrDetails(doc.verificationRecord?.response || null, doc.documentType)}>
                                    Show Details
                                  </DropdownMenuItem>
                                </>
                              );
                            })()}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {isEditMode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const docs = [...(field.value || [])];
                              docs.splice(idx, 1);
                              field.onChange(docs.length > 0 ? docs : undefined);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}

                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-neutral-400">
                  <EmptyState text="No documents added" />
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 justify-end"
                onClick={() => {
                  field.onChange([
                    ...(field.value || []),
                    {
                      verificationDocumentId: '',
                      documentType: '',
                      value: '',
                      verificationStatus: 'unverified',
                      documentImages: []
                    },
                  ]);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Document
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Attestr Response Details Modal */}
      <Dialog open={showAttestrModal} onOpenChange={setShowAttestrModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{documentType} Verification Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {attestrData ? (
              <div className="space-y-4">
                {/* Common fields for GST documents */}
                {documentType === 'GST' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Valid</label>
                        <p className="text-sm">{attestrData.valid ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Active</label>
                        <p className="text-sm">{attestrData.active ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Legal Name</label>
                        <p className="text-sm">{attestrData.legalName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Trade Name</label>
                        <p className="text-sm">{attestrData.tradeName}</p>
                      </div>
                    </div>
                  </>
                )}

                {documentType === 'PAN' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Valid</label>
                        <p className="text-sm">{attestrData.valid ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Category</label>
                        <p className="text-sm">{attestrData.category}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-sm">{attestrData.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Aadhaar Linked</label>
                        <p className="text-sm">{attestrData.aadhaarLinked ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {documentType === 'GST' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">GST Number</label>
                        <p className="text-sm">{attestrData.gstNumber || attestrData.pan}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Constitution</label>
                        <p className="text-sm">{attestrData.constitution}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">State</label>
                        <p className="text-sm">{attestrData.state}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">State Code</label>
                        <p className="text-sm">{attestrData.stateCode}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Center</label>
                        <p className="text-sm">{attestrData.center}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Center Code</label>
                        <p className="text-sm">{attestrData.centerCode}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Type</label>
                        <p className="text-sm">{attestrData.type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Registered</label>
                        <p className="text-sm">{attestrData.registered}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Updated</label>
                        <p className="text-sm">{attestrData.updated}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Expiry</label>
                      <p className="text-sm">{attestrData.expiry || 'No expiry date'}</p>
                    </div>
                  </div>
                )}

                {/* Nature field for GST documents */}
                {documentType === 'GST' && attestrData.nature && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nature</label>
                    <p className="text-sm">{attestrData.nature.join(', ')}</p>
                  </div>
                )}


                {attestrData.addresses && attestrData.addresses.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Addresses</label>
                    <div className="space-y-2">
                      {attestrData.addresses.map((address: any, idx: number) => (
                        <div key={idx} className="border rounded p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium mb-2">Address {idx + 1}</div>
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div><strong>Type:</strong> {address.type}</div>
                                  <div><strong>Building:</strong> {address.building}</div>
                                </div>
                                {address.buildingName && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div><strong>Building Name:</strong> {address.buildingName}</div>
                                    {address.floor && <div><strong>Floor:</strong> {address.floor}</div>}
                                  </div>
                                )}
                                <div className="grid grid-cols-1 gap-2">
                                  <div><strong>Street:</strong> {address.street}</div>
                                  <div><strong>Locality:</strong> {address.locality}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><strong>District:</strong> {address.district}</div>
                                  <div><strong>State:</strong> {address.state}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><strong>ZIP:</strong> {address.zip}</div>
                                  <div><strong>Nature:</strong> {address.nature}</div>
                                </div>
                                {(address.latitude || address.longitude) && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div><strong>Latitude:</strong> {address.latitude}</div>
                                    <div><strong>Longitude:</strong> {address.longitude}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {documentType === 'GST' && (
                            <div className="mt-3 flex justify-end">
                              {address.type === 'PRIMARY' ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const addressData = {
                                      streetAddress: `${address.building || ''} ${address.street || ''} ${address.locality || ''}`.trim(),
                                      pincode: address.zip || '',
                                      area: address.locality || '',
                                      district: address.district || '',
                                      state: address.state || '',
                                      location: (address.latitude && address.longitude) ? {
                                        type: 'Point' as const,
                                        coordinates: [parseFloat(address.longitude), parseFloat(address.latitude)]
                                      } : undefined
                                    };
                                    onBillingAddressUpdate?.(addressData);
                                    setShowAttestrModal(false); // Close modal after updating
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Make it as billing address
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const addressData = {
                                      streetAddress: `${address.building || ''} ${address.street || ''} ${address.locality || ''}`.trim(),
                                      pincode: address.zip || '',
                                      area: address.locality || '',
                                      district: address.district || '',
                                      state: address.state || '',
                                      location: (address.latitude && address.longitude) ? {
                                        type: 'Point' as const,
                                        coordinates: [parseFloat(address.longitude), parseFloat(address.latitude)]
                                      } : undefined
                                    };
                                    onShippingAddressUpdate?.(addressData);
                                    setShowAttestrModal(false); // Close modal after updating
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Make it as shipping address
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-500">No tax verification details available for this document.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default VerificationDocumentsSection; 