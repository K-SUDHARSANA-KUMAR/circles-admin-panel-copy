'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { LocationPickerModal } from '@/components/modals/location-picker-modal';
import { DuplicateOutletsModal } from '@/components/modals/outlets/duplicate-outlets-modal';
import { WarehouseMultiSelectSection } from '@/components/sections/warehouses-multiselect-section';
import { DuplicateOutletsCard } from '@/components/sections/duplicate-outlets-card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import GenericError from '@/components/ui/generic-error';
import Loading from '@/components/ui/loading';
import NavKeys from '@/constants/navkeys';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { AddressSection } from './_components/address-section';
import BillingAddressSection from './_components/billing-address-section';

import BankDetailsSection from './_components/bank-details-section';
import KycDocumentsSection from './_components/kyc-documents-section';
import { OutletInfoSection } from './_components/outlet-info-section';
import VerificationDocumentsSection from './_components/verification-documents-section.tsx';
import { BeatDetailsSection } from './_components/beat-details-section';
import { OutletAccountsInfoSection } from './_components/outlet-accounts-info-section';
import { useOutletCreate } from './_hooks/useOutletCreate';

const OutletCreatePage = () => {
  return (
    <RequirePermission module="outlets" action={['create', 'edit']}>
      <OutletCreateContent />
    </RequirePermission>
  );
};

const OutletCreateContent = () => {
  const router = useRouter();
  const [isSameAsBilling, setIsSameAsBilling] = useState(true);
  const [billingVisibleFields, setBillingVisibleFields] = useState<string[]>(['streetAddress', 'pincode', 'area', 'district', 'state', 'location']);
  const [isUserInitiatedSubmit, setIsUserInitiatedSubmit] = useState(false);

  const {
    // mode
    isEditMode,
    isViewMode,
    isEditing,
    setIsEditing,
    outletId,
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

    // duplicate outlets
    duplicateOutlets,
    setDuplicateOutlets,
    isDuplicateModalOpen,
    setIsDuplicateModalOpen,
    handleCreateNewOutlet,
  } = useOutletCreate();

  const handleViewVerificationLogs = (verificationDocumentId: string) => {
    if (outletId) {
      router.push(`/dashboard/outlets/outlet/verification-logs?outletId=${outletId}&verificationDocumentId=${verificationDocumentId}`);
    }
  };

  if ((isEditMode || isViewMode) && outletQuery.isLoading) {
    return (
      <section className="flex h-full items-center justify-center">
        <Loading text="Loading outlet data..." />
      </section>
    );
  }

  if ((isEditMode || isViewMode) && outletQuery.error) {
    return (
      <section className="flex h-full items-center justify-center">
        <GenericError text="Error loading outlet data. Please try again." />
      </section>
    );
  }

  // Determine if fields should be disabled
  const isFormDisabled = isViewMode && !isEditing;

  // Track if form has been modified
  const hasFormChanges = form.formState.isDirty;

  return (
    <section className="w-full space-y-6 overflow-x-hidden">
      <BreadcrumbHeader
        {...breadcrumb}
        actions={
          isViewMode && !isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </Button>
          ) : undefined
        }
      />

      <Form {...form}>
        <form
          id="outlet-form"
          onSubmit={(e) => {
            e.preventDefault();
            // Prevent form submission in view mode when not editing
            if (isViewMode && !isEditing) {
              return;
            }
            // Only submit if user explicitly clicked the button
            if (!isUserInitiatedSubmit) {
              return;
            }
            form.handleSubmit(onSubmit)(e);
            setIsUserInitiatedSubmit(false); // Reset after submission
          }}
          className="space-y-6 overflow-x-hidden"
        >
          {(isEditMode || isViewMode) && outletId && (
            <DuplicateOutletsCard outletId={outletId} />
          )}
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
            disabled={isFormDisabled}
            outletData={outletData}
          />

          <BeatDetailsSection
            form={form}
            stateId={form.watch('state')}
            districtId={form.watch('district')}
            disabled={isFormDisabled}
          />

          <OutletAccountsInfoSection
            form={form}
            disabled={isFormDisabled}
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
            disabled={isFormDisabled}
          />

          {!isSameAsBilling && (
            <BillingAddressSection
              form={form}
              isPincodeLoading={isPincodeLoading}
              selectedBillingCoordinates={selectedBillingCoordinates}
              setIsBillingLocationModalOpen={setIsBillingLocationModalOpen}
              visibleFields={billingVisibleFields}
              disabled={isFormDisabled}
            />
          )}

          <BankDetailsSection
            form={form}
            disabled={isFormDisabled}
          />

          <VerificationDocumentsSection
            form={form}
            isEditMode={isEditMode || isEditing}
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
            outletId={outletId || undefined}
            onViewLogs={handleViewVerificationLogs}
          />

          <KycDocumentsSection
            form={form}
            isEditMode={isEditMode}
            handleStatusUpdate={handleStatusUpdate}
            uploadMultipleFiles={uploadMultipleFiles}
            disabled={isFormDisabled}
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
            disabled={isFormDisabled}
          />

          {!isFormDisabled && (
            <div className="flex justify-end gap-2">
              {isViewMode && isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form to original values
                    if (outletData) {
                      outletQuery.refetch();
                    }
                  }}
                >
                  Cancel
                </Button>
              ) : (
                <Button type="button" variant="outline" asChild>
                  <Link href={breadcrumb.backHref}>Cancel</Link>
                </Button>
              )}
              <Button
                type="submit"
                className="flex items-center gap-2"
                disabled={
                  createOutlet.isPending ||
                  updateOutlet.isPending ||
                  uploadMultipleFiles.isPending
                }
                onClick={() => {
                  setIsUserInitiatedSubmit(true);
                }}
              >
                {isEditMode || isViewMode
                  ? updateOutlet.isPending
                    ? 'Updating...'
                    : 'Update Outlet'
                  : createOutlet.isPending
                    ? 'Creating...'
                    : 'Create Outlet'}
                {uploadMultipleFiles.isPending && ' (Uploading Images...)'}
              </Button>
            </div>
          )}
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

      <DuplicateOutletsModal
        open={isDuplicateModalOpen}
        onOpenChange={setIsDuplicateModalOpen}
        existingOutlets={duplicateOutlets}
        onCreateNew={handleCreateNewOutlet}
        isCreating={createOutlet.isPending}
      />
    </section>
  );
};

export default OutletCreatePage;
