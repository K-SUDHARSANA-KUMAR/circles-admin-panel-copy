"use client";

import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageUploadField } from '@/components/image-upload/image-upload';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCloudFrontUrl } from '@/utils/common-utils';
import { Plus } from 'lucide-react';

import type { OutletStatus } from '../_types/outlet.types';

type Props = {
  form: any;
  isEditMode: boolean;
  existingImages: { s3Filename: string }[];
  uploadedFiles: File[];
  uploadedS3FileNames: string[];
  handleOutletImagesChange: (files: File[]) => Promise<void> | void;
  uploadMultipleFilesPending: boolean;
  selectedOutletStatus?: OutletStatus;
  setSelectedOutletStatus: (value?: OutletStatus) => void;
  outletData?: any;
};

export const OutletInfoSection = ({
  form,
  isEditMode,
  existingImages,
  uploadedFiles,
  uploadedS3FileNames,
  handleOutletImagesChange,
  uploadMultipleFilesPending,
  selectedOutletStatus,
  setSelectedOutletStatus,
  outletData,
}: Props) => {
  return (
    <div className="rounded-lg bg-white p-4">
      <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">Outlet Information</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="outletName"
          render={({ field }) => (
            <FormItem>
              <FormLabel isRequired>
                Outlet Name
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter outlet name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel isRequired>
                Business Type
              </FormLabel>
              <FormControl>
                <MasterRecordSelect
                  masterName="businessType"
                  className="w-full"
                  value={field.value ? String(field.value) : ''}
                  onChange={field.onChange}
                  placeholder="Select Business Type"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="md:row-span-3">
          <ImageUploadField
            name="outletImages"
            label="Upload Outlet Images *"
            multiple
            maxImages={5}
            placeholder="Upload outlet images - Click or drag and drop"
            onChange={handleOutletImagesChange}
            value={[
              ...existingImages.map((img: any) => getCloudFrontUrl(img.s3Filename)),
              ...uploadedFiles.map((file) => URL.createObjectURL(file)),
            ]}
            disabled={uploadMultipleFilesPending}
            onRemove={(index) => {
              const totalExistingImages = existingImages.length;
              if (index < totalExistingImages) {
                const newExistingImages = [...existingImages];
                newExistingImages.splice(index, 1);
                form.setValue(
                  'outletImages',
                  [
                    ...newExistingImages,
                    ...uploadedS3FileNames.map((s3FileName) => ({ s3Filename: s3FileName })),
                  ]
                );
              } else {
                const newFileIndex = index - totalExistingImages;
                const newS3FileNames = [...uploadedS3FileNames];
                newS3FileNames.splice(newFileIndex, 1);
                form.setValue(
                  'outletImages',
                  [
                    ...existingImages,
                    ...newS3FileNames.map((s3FileName) => ({ s3Filename: s3FileName })),
                  ]
                );
              }
            }}
          />
        </div>

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Phone Number
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter phone number"
                  {...field}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/\D/g, '').slice(0, 10);
                    field.onChange(target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email </FormLabel>
              <FormControl>
                <Input placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel isRequired>
                Owner Name
              </FormLabel>
              <FormControl>
                <Input placeholder="Owner Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="totalPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Person</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  type="number"
                  maxLength={10}
                  placeholder="Enter no of persons"
                  {...field}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outletStoreSqFtId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Sq Ft</FormLabel>
              <FormControl>
                <MasterRecordSelect
                  masterName="outletStoreSqFt"
                  className="w-full"
                  value={field.value ? String(field.value) : ''}
                  onChange={field.onChange}
                  placeholder="Select Total Sq Ft"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Read-only Outlet Code field - displays only outletCode */}
        {isEditMode && outletData?.outletCode && (
          <FormItem>
            <FormLabel>Outlet Code</FormLabel>
            <FormControl>
              <Input 
                value={outletData?.outletCode || ''} 
                readOnly 
                disabled
                className="bg-gray-50 cursor-not-allowed"
              />
            </FormControl>
          </FormItem>
        )}

        {isEditMode && (
          <FormItem>
            <FormLabel>Outlet Status</FormLabel>
            <FormControl>
              {selectedOutletStatus === 'active' || selectedOutletStatus === 'suspended' ? (
                <Select
                  value={(selectedOutletStatus as string) || ''}
                  onValueChange={(value) => setSelectedOutletStatus(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-9 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm text-gray-500">
                  {selectedOutletStatus ? String(selectedOutletStatus).charAt(0).toUpperCase() + String(selectedOutletStatus).slice(1) : 'Unknown'}
                </div>
              )}
            </FormControl>
          </FormItem>
        )}
      </div>
    </div>
  );
};

export default OutletInfoSection; 