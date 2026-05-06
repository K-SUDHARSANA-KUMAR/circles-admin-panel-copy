'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { LocationPickerModal } from '@/components/modals/location-picker-modal';
import { WarehouseMultiSelectSection } from '@/components/sections/warehouses-multiselect-section';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import GenericError from '@/components/ui/generic-error';
import Loading from '@/components/ui/loading';
import NavKeys from '@/constants/navkeys';
import Link from 'next/link';
import { useState } from 'react';

import AddressSection from './_components/address-section';
import BillingAddressSection from './_components/billing-address-section';

import BankDetailsSection from './_components/bank-details-section';
import KycDocumentsSection from './_components/kyc-documents-section';
import { OutletInfoSection } from './_components/outlet-info-section';
import VerificationDocumentsSection from './_components/verification-documents-section.tsx';
import { useOutletCreate } from './_hooks/useOutletCreate';

const OutletCreatePage = () => {
  return (
    <RequirePermission module="outlets" action={['create', 'edit']}>
      <OutletCreateContent />
    </RequirePermission>
  );
};

const OutletCreateContent = () => {
  const [isSameAsBilling, setIsSameAsBilling] = useState(true);
  const [billingVisibleFields, setBillingVisibleFields] = useState<string[]>(['streetAddress', 'pincode', 'area', 'district', 'state', 'location']);
  
  const {
    // mode
    isEditMode,
    breadcrumb,

    // queries
    outletQuery,
    outletData,

    // form
    form,

    // images
    existingImages,
    uploadedFiles,
    uploadedS3FileNames,
    handleOutletImagesChange,

    // pincode
    isPincodeLoading,

    // status
    selectedOutletStatus,
    setSelectedOutletStatus,

    // maps
    isLocationModalOpen,
    setIsLocationModalOpen,
    selectedCoordinates,
    setSelectedCoordinates,
    handleLocationSelect,
    isBillingLocationModalOpen,
    setIsBillingLocationModalOpen,
    selectedBillingCoordinates,
    setSelectedBillingCoordinates,
    handleBillingLocationSelect,

    // actions
    handleStatusUpdate,
    onSubmit,

    // mutations
    createOutlet,
    updateOutlet,
    uploadMultipleFiles,
  } = useOutletCreate();

  if (isEditMode && outletQuery.isLoading) {
    return (
      <section className="flex h-full items-center justify-center">
        <Loading text="Loading outlet data..." />
      </section>
    );
  }

  if (isEditMode && outletQuery.error) {
    return (
      <section className="flex h-full items-center justify-center">
        <GenericError text="Error loading outlet data. Please try again." />
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <BreadcrumbHeader {...breadcrumb} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <OutletInfoSection
            form={form}
            isEditMode={isEditMode}
            existingImages={existingImages}
            uploadedFiles={uploadedFiles}
            uploadedS3FileNames={uploadedS3FileNames}
            handleOutletImagesChange={handleOutletImagesChange}
            uploadMultipleFilesPending={uploadMultipleFiles.isPending}
            selectedOutletStatus={selectedOutletStatus}
            setSelectedOutletStatus={setSelectedOutletStatus}
            outletData={outletData}
          />


          <AddressSection
            form={form}
            isPincodeLoading={isPincodeLoading}
            selectedCoordinates={selectedCoordinates}
            setIsLocationModalOpen={setIsLocationModalOpen}
            onSameAsBillingChange={setIsSameAsBilling}
            onBillingFieldsChange={setBillingVisibleFields}
            isSameAsBilling={isSameAsBilling}
            setIsSameAsBilling={setIsSameAsBilling}
          />

          {!isSameAsBilling && (
            <BillingAddressSection
              form={form}
              isPincodeLoading={isPincodeLoading}
              selectedBillingCoordinates={selectedBillingCoordinates}
              setIsBillingLocationModalOpen={setIsBillingLocationModalOpen}
              visibleFields={billingVisibleFields}
            />
          )}

          <BankDetailsSection
            form={form}
          />

          <VerificationDocumentsSection
            form={form}
            isEditMode={isEditMode}
            handleStatusUpdate={handleStatusUpdate}
            uploadMultipleFiles={uploadMultipleFiles}
            onBillingAddressUpdate={(addressData: any) => {
              // Update billing address fields with GST address data
              form.setValue('billingAddress.streetAddress', addressData.streetAddress || '');
              form.setValue('billingAddress.pincode', addressData.pincode || '');
              form.setValue('billingAddress.area', addressData.area || '');
              form.setValue('billingAddress.district', addressData.district || '');
              form.setValue('billingAddress.state', addressData.state || '');
              if (addressData.location) {
                form.setValue('billingAddress.location', addressData.location);
                // Update billing coordinates for map display
                const coordinates = addressData.location.coordinates;
                if (coordinates && coordinates.length === 2) {
                  setSelectedBillingCoordinates({
                    lat: coordinates[1], // latitude is second coordinate
                    lng: coordinates[0]  // longitude is first coordinate
                  });
                }
              }
              // Uncheck "Same as billing address" checkbox
              setIsSameAsBilling(false);
            }}
            onShippingAddressUpdate={(addressData: any) => {
              // Update outlet address fields with GST address data (shipping address is outlet address)
              form.setValue('outletAddress.streetAddress', addressData.streetAddress || '');
              form.setValue('pincode', addressData.pincode || '');
              form.setValue('area', addressData.area || '');
              form.setValue('district', addressData.district || '');
              form.setValue('state', addressData.state || '');
              if (addressData.location) {
                form.setValue('outletAddress.location', addressData.location);
                // Update outlet coordinates for map display
                const coordinates = addressData.location.coordinates;
                if (coordinates && coordinates.length === 2) {
                  setSelectedCoordinates({
                    lat: coordinates[1], // latitude is second coordinate
                    lng: coordinates[0]  // longitude is first coordinate
                  });
                }
              }
            }}
          />

          <KycDocumentsSection
            form={form}
            isEditMode={isEditMode}
            handleStatusUpdate={handleStatusUpdate}
            uploadMultipleFiles={uploadMultipleFiles}
          />

          <WarehouseMultiSelectSection
            selectedWarehouseIds={
              form.watch('mappings')?.map((w: any) => w.warehouseId) || []
            }
            onChange={(ids) =>
              form.setValue(
                'mappings',
                ids.map((id) => ({ warehouseId: id }))
              )
            }
            hideFilters={true}
            pincode={form.watch('pincode')}
            requirePincode={true}
            requireUserMapping={false}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href={NavKeys.Outlets}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              className="flex items-center gap-2"
              disabled={
                createOutlet.isPending ||
                updateOutlet.isPending ||
                uploadMultipleFiles.isPending
              }
            >
              {isEditMode
                ? updateOutlet.isPending
                  ? 'Updating...'
                  : 'Update Outlet'
                : createOutlet.isPending
                  ? 'Creating...'
                  : 'Create Outlet'}
              {uploadMultipleFiles.isPending && ' (Uploading Images...)'}
            </Button>
          </div>
        </form>
      </Form>

      <LocationPickerModal
        open={isLocationModalOpen}
        onOpenChange={setIsLocationModalOpen}
        onLocationSelect={handleLocationSelect}
        initialCoordinates={selectedCoordinates || undefined}
      />

      <LocationPickerModal
        open={isBillingLocationModalOpen}
        onOpenChange={setIsBillingLocationModalOpen}
        onLocationSelect={handleBillingLocationSelect}
        initialCoordinates={selectedBillingCoordinates || undefined}
      />
    </section>
  );
};

export default OutletCreatePage;
