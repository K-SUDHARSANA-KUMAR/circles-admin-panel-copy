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

const kycDocumentTypeOptions = [
  { label: 'Driving License', value: 'driving-license' },
  { label: 'Aadhar Card', value: 'aadhar' },
];

type Props = {
  form: any;
  isEditMode: boolean;
  handleStatusUpdate: (index: number, status: 'verified' | 'unverified' | 'invalid') => Promise<void> | void;
  uploadMultipleFiles: { mutateAsync: (args: { files: File[]; folder?: string }) => Promise<string[]>; isPending: boolean };
  disabled?: boolean;
};

export const KycDocumentsSection = ({ form, isEditMode, handleStatusUpdate, uploadMultipleFiles, disabled = false }: Props) => {
  return (
    <div className="rounded-lg bg-white p-4">
      <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">KYC Verification Documents</div>
      <FormField
        control={form.control}
        name="kycDocuments"
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
                            {isEditMode && (
                              <FormField
                                control={form.control}
                                name={`kycDocuments.${idx}.verificationStatus`}
                                render={({ field: docField }) => (
                                  <div>{renderStatusBadge(docField.value || 'Not Set', StatusType.VERIFICATION)}</div>
                                )}
                              />
                            )}
                          </div>
                          <FormSelect
                            control={form.control}
                            name={`kycDocuments.${idx}.documentType`}
                            label=""
                            placeholder="Select type"
                            options={kycDocumentTypeOptions}
                            onChange={(value) => {
                              form.clearErrors(`kycDocuments.${idx}.value`);
                            }}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`kycDocuments.${idx}.value`}
                          render={({ field: docField }) => (
                            <FormItem>
                              <FormLabel>Document No</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={(() => {
                                    const docType = form.getValues(`kycDocuments.${idx}.documentType`);
                                    switch (docType) {
                                      case 'driving-license':
                                        return 'Enter Driving License number';
                                      case 'aadhar':
                                        return 'Enter Aadhar Card number';
                                      default:
                                        return 'Enter document number';
                                    }
                                  })()}
                                  {...docField}
                                  onChange={(e) => {
                                    const documentType = form.getValues(`kycDocuments.${idx}.documentType`);
                                    let value = e.target.value;
                                    if (documentType === 'driving-license') {
                                      value = value.toUpperCase();
                                    }
                                    docField.onChange(value);
                                  }}
                                  onBlur={(e) => {
                                    docField.onBlur();
                                    const documentType = form.getValues(`kycDocuments.${idx}.documentType`);
                                    const value = e.target.value;
                                    if (documentType && value) {
                                      const validation = validateDocument(documentType, value);
                                      if (!validation.isValid) {
                                        form.setError(`kycDocuments.${idx}.value`, { type: 'manual', message: validation.message });
                                      } else {
                                        form.clearErrors(`kycDocuments.${idx}.value`);
                                      }
                                    }
                                  }}
                                  disabled={disabled}
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
                          name={`kycDocuments.${idx}.documentImages`}
                          label="Document Images *"
                          multiple
                          maxImages={3}
                          placeholder="Upload document images - Click or drag and drop (max 3 images)"
                          aspectRatio="auto"
                          fixedHeight="h-48"
                          value={(() => {
                            const documentImages = form.getValues(`kycDocuments.${idx}.documentImages`);
                            return documentImages?.map((img: any) => getCloudFrontUrl(img.s3Filename)) || [];
                          })()}
                          onChange={async (files) => {
                            try {
                              const s3FileNames = await uploadMultipleFiles.mutateAsync({ files, folder: 'documentimages' });
                              const currentDocs = form.getValues('kycDocuments') || [];
                              const updatedDocs = [...currentDocs];
                              const existingImages = updatedDocs[idx]?.documentImages || [];
                              updatedDocs[idx] = {
                                ...updatedDocs[idx],
                                documentImages: [
                                  ...existingImages,
                                  ...s3FileNames.map((s3FileName) => ({ s3Filename: s3FileName })),
                                ],
                              };
                              form.setValue('kycDocuments', updatedDocs);
                              toast.success('KYC document images uploaded successfully!');
                            } catch (error: any) {
                              console.error('Failed to upload KYC document images:', error);
                              toast.error(error?.message || 'Failed to upload KYC document images. Please try again.');
                            }
                          }}
                          onRemove={(imageIndex) => {
                            const currentDocs = form.getValues('kycDocuments') || [];
                            const updatedDocs = [...currentDocs];
                            const existingImages = Array.isArray(updatedDocs[idx]?.documentImages)
                              ? [...updatedDocs[idx].documentImages]
                              : [];
                            if (imageIndex >= 0 && imageIndex < existingImages.length) {
                              existingImages.splice(imageIndex, 1);
                            }
                            updatedDocs[idx] = { ...updatedDocs[idx], documentImages: existingImages };
                            form.setValue('kycDocuments', updatedDocs);
                          }}
                          disabled={disabled}
                        />
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        {isEditMode ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(() => {
                                const currentStatus = form.getValues(`kycDocuments.${idx}.verificationStatus`);
                                return (
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
                                    <DropdownMenuItem>Logs</DropdownMenuItem>
                                  </>
                                );
                              })()}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const docs = [...(field.value || [])];
                            docs.splice(idx, 1);
                            field.onChange(docs.length > 0 ? docs : undefined);
                          }}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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
                    { documentType: '', value: '', verificationStatus: 'unverified' },
                  ]);
                }}
                disabled={disabled}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Document
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default KycDocumentsSection; 