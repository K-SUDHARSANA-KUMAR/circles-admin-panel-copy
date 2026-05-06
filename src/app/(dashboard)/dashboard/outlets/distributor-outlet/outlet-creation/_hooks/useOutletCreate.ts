'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import NavKeys from '@/constants/navkeys';
import { useFileUpload } from '@/features/common/hooks/useFileUpload';
import { useOutlets } from '@/features/dashboard/outlets/hooks/useOutlets';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { fetchPincodeDetails } from '@/utils/api-utils';
import { validateDocument } from '@/utils/common-utils';
import {
  outletFormSchema,
  type OutletFormData,
} from '../_schema/outlet-schema';

import type {
  Coordinates,
  OutletStatus,
  VerificationDoc,
} from '../_types/outlet.types';

export const useOutletCreate = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const outletId = searchParams.get('outletId');
  const isEditMode = mode === 'edit' && Boolean(outletId);

  const breadcrumb = useMemo(
    () => getBreadcrumbData('outlet', isEditMode ? 'edit' : 'create'),
    [isEditMode]
  );

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] =
    useState<Coordinates | null>(null);
  const [isBillingLocationModalOpen, setIsBillingLocationModalOpen] = useState(false);
  const [selectedBillingCoordinates, setSelectedBillingCoordinates] =
    useState<Coordinates | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedS3FileNames, setUploadedS3FileNames] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<
    { s3Filename: string }[]
  >([]);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [selectedOutletStatus, setSelectedOutletStatus] =
    useState<OutletStatus>(undefined);

  const { createOutlet, updateOutlet, getOutlet, updateDocumentStatus } =
    useOutlets({ enabled: false });
  const { warehouses } = useWarehouse();
  const { uploadMultipleFiles } = useFileUpload();
  const outletQuery = getOutlet(outletId || '');
  const outletData = outletQuery.data?.data as any;

  const form = useForm<OutletFormData>({
    resolver: zodResolver(outletFormSchema) as any,
    defaultValues: {
      outletName: '',
      businessTypeId: '',
      shortCode: '',
      email: '',
      ownerName: '',
      totalPerson: 0,
      outletStoreSqFtId: '',
      phoneNumber: '',
      outletImages: [],
      pincode: '',
      area: '',
      district: '',
      state: '',
      outletAddress: {
        streetAddress: '',
        location: { type: 'Point', coordinates: [0, 0] },
      },
      billingAddress: {
        streetAddress: '',
        pincode: '',
        area: '',
        district: '',
        state: '',
        location: { type: 'Point', coordinates: [0, 0] },
      },
      bankDetails: {
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        branchName: '',
      },
      verificationDocuments: [],
      kycDocuments: [],
      mappings: [],
    },
    mode: 'onChange',
    reValidateMode: 'onBlur',
    shouldUnregister: false,
    criteriaMode: 'firstError',
  });

  const watchedPincode = form.watch('pincode');
  const watchedBillingPincode = form.watch('billingAddress.pincode');
  useEffect(() => {
    if (
      watchedPincode !== (outletData?.pincode ? String(outletData.pincode) : '')
    ) {
      form.setValue('mappings', []);
    }
  }, [watchedPincode, form, outletData?.pincode]);

  const handleOutletImagesChange = async (files: File[]) => {
    if (files.length === 0) {
      setUploadedFiles([]);
      setUploadedS3FileNames([]);
      form.setValue('outletImages', existingImages);
      return;
    }

    const newUploadedFiles = [...uploadedFiles, ...files];
    setUploadedFiles(newUploadedFiles);

    try {
      const newS3FileNames = await uploadMultipleFiles.mutateAsync({ files });
      const allS3FileNames = [...uploadedS3FileNames, ...newS3FileNames];
      setUploadedS3FileNames(allS3FileNames);
      const newImages = allS3FileNames.map((s3FileName: string) => ({
        s3Filename: s3FileName,
      }));
      const allImages = [...existingImages, ...newImages];
      form.setValue('outletImages', allImages);
    } catch (error: any) {
      setUploadedFiles(uploadedFiles);
    }
  };

  const handleStatusUpdate = async (
    index: number,
    status: 'verified' | 'unverified' | 'invalid'
  ) => {
    if (!outletId) {
      return;
    }

    const doc = form.getValues(
      `verificationDocuments.${index}` as any
    ) as VerificationDoc;
    if (!doc?.documentType) {
      return;
    }

    try {
      await updateDocumentStatus.mutateAsync({
        outletId,
        documentType: doc.documentType!,
        verificationStatus: status,
      });
      form.setValue(
        `verificationDocuments.${index}.verificationStatus` as any,
        status as any
      );
    } catch {}
  };

  useEffect(() => {
    if (isEditMode && outletData) {
      const coordinates = {
        lat: outletData.outletAddress.location.coordinates[1],
        lng: outletData.outletAddress.location.coordinates[0],
      } as Coordinates;

      const existing = outletData.outletImages ? outletData.outletImages : [];
      setExistingImages(existing);

      const allDocs = Array.isArray(outletData.verificationDocuments)
        ? outletData.verificationDocuments
        : [];
      const taxDocTypes = new Set(['PAN', 'GST']);
      const mapDoc = (doc: any) => ({
        documentType: doc.documentType,
        value: doc.value,
        verificationStatus: doc.verificationStatus,
        verificationReason: doc.verificationReason,
        verifiedBy: doc.verifiedBy,
        verifiedAt: doc.verifiedAt ? new Date(doc.verifiedAt) : undefined,
        documentImages:
          doc.documentImages ||
          (doc.s3Filename ? [{ s3Filename: doc.s3Filename }] : []),
        attestrResponse: doc.attestrResponse,
        verificationRecord: doc.verificationRecord,
      });
      const taxDocs = allDocs
        .filter((d: any) => taxDocTypes.has(d.documentType))
        .map(mapDoc);
      const kycDocs = allDocs
        .filter((d: any) => !taxDocTypes.has(d.documentType))
        .map(mapDoc);

      form.reset({
        outletName: outletData.outletName || '',
        businessTypeId: outletData.businessTypeId
          ? String(outletData.businessTypeId)
          : '',
        shortCode: outletData.shortCode || '',
        phoneNumber: outletData.phoneNumber || '',
        email: outletData.email || '',
        ownerName: outletData.ownerName || '',
        totalPerson: outletData.totalPerson || '',
        outletStoreSqFtId: outletData.outletStoreSqFtId
          ? String(outletData.outletStoreSqFtId)
          : '',
        outletImages: existing,
        pincode: outletData.pincode ? String(outletData.pincode) : '',
        area: outletData.area || '',
        district: outletData.district || '',
        state: outletData.state || '',
        outletAddress: {
          streetAddress: outletData.outletAddress.streetAddress || '',
          location: {
            type: 'Point',
            coordinates: [coordinates.lng, coordinates.lat] as [number, number],
          },
        },
        verificationDocuments: taxDocs,
        kycDocuments: kycDocs,
        mappings: Array.isArray(outletData.mappings)
          ? outletData.mappings.map((m: any) => ({
              warehouseId: m.warehouseId,
            }))
          : [],
      } as any);

      setSelectedCoordinates(coordinates);
      setSelectedOutletStatus(outletData.outletStatus as OutletStatus);

      if (outletData.pincode && String(outletData.pincode).length === 6) {
        setIsPincodeLoading(true);
        fetchPincodeDetails(String(outletData.pincode))
          .then((result) => {
            const item = result?.data?.items?.[0];
            if (item) {
              form.setValue('area', item?.area ?? '');
              form.setValue('district', item?.districtName ?? '');
              form.setValue('state', item?.stateName ?? '');
            }
          })
          .finally(() => setIsPincodeLoading(false));
      }
    }
  }, [isEditMode, outletData, form]);

  useEffect(() => {
    if (!watchedPincode || String(watchedPincode).length !== 6) return;
    setIsPincodeLoading(true);
    fetchPincodeDetails(watchedPincode)
      .then((result) => {
        const item = result?.data?.items?.[0];
        if (item) {
          form.setValue('area', item?.area ?? '');
          form.setValue('district', item?.districtName ?? '');
          form.setValue('state', item?.stateName ?? '');
        }
      })
      .finally(() => setIsPincodeLoading(false));
  }, [watchedPincode, form]);

  // Auto-fill billing address fields when billing pincode is entered
  useEffect(() => {
    if (!watchedBillingPincode || String(watchedBillingPincode).length !== 6) return;
    setIsPincodeLoading(true);
    fetchPincodeDetails(watchedBillingPincode)
      .then((result) => {
        const item = result?.data?.items?.[0];
        if (item) {
          form.setValue('billingAddress.area', item?.area ?? '');
          form.setValue('billingAddress.district', item?.districtName ?? '');
          form.setValue('billingAddress.state', item?.stateName ?? '');
        }
      })
      .finally(() => setIsPincodeLoading(false));
  }, [watchedBillingPincode, form]);

  // Watch billing address location and always recompute map coords (handles "same as shipping")
  useEffect(() => {
    const subscription = form.watch(() => {
      const billingLocation = form.getValues('billingAddress.location' as any);
      const coordinates = (billingLocation as any)?.coordinates;
      if (Array.isArray(coordinates) && coordinates.length === 2) {
        const [lng, lat] = coordinates as [number, number];
        if (
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        ) {
          setSelectedBillingCoordinates({ lat, lng });
          return;
        }
      }
      // Clear if invalid or missing
      setSelectedBillingCoordinates(null);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Watch for changes in shipping (outlet) address location and update selectedCoordinates
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'outletAddress.location') {
        const outletLocation = (value as any)?.outletAddress?.location;
        const coordinates = outletLocation?.coordinates;
        if (Array.isArray(coordinates) && coordinates.length === 2) {
          const [lng, lat] = coordinates;
          if (typeof lat === 'number' && typeof lng === 'number' && 
              lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            setSelectedCoordinates({ lat, lng });
          } else {
            // Clear coordinates if invalid
            setSelectedCoordinates(null);
          }
        } else {
          // Clear coordinates if no valid coordinates
          setSelectedCoordinates(null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleLocationSelect = (coordinates: Coordinates, address?: string, pincode?: string) => {
    setSelectedCoordinates(coordinates);
    form.setValue(
      'outletAddress.location.coordinates' as any,
      [coordinates.lng, coordinates.lat] as any
    );
    
    // If address is provided, update the street address field
    if (address) {
      form.setValue('outletAddress.streetAddress', address);
    }
    // If pincode is provided, set it (this will auto-fill area/district/state via effect)
    if (pincode) {
      form.setValue('pincode', String(pincode));
    }
    
    setIsLocationModalOpen(false);
  };

  const handleBillingLocationSelect = (coordinates: Coordinates, address?: string, pincode?: string) => {
    setSelectedBillingCoordinates(coordinates);
    form.setValue(
      'billingAddress.location.coordinates' as any,
      [coordinates.lng, coordinates.lat] as any
    );
    
    // If address is provided, update the billing street address field
    if (address) {
      form.setValue('billingAddress.streetAddress', address);
    }
    // If pincode is provided, set it to billing (this will auto-fill area/district/state via effect)
    if (pincode) {
      form.setValue('billingAddress.pincode', String(pincode));
    }
    
    
    setIsBillingLocationModalOpen(false);
  };

  const onSubmit = async (data: OutletFormData) => {
    try {
      if (!selectedCoordinates) {
        form.setError('outletAddress.location.coordinates' as any, {
          type: 'manual',
          message: 'Please select a location on the map',
        });
        return;
      }


      const currentVerificationDocs =
        form.getValues('verificationDocuments') || [];
      const currentKycDocs = form.getValues('kycDocuments') || [];

      if (currentVerificationDocs && currentVerificationDocs.length > 0) {
        let hasValidationErrors = false;
        currentVerificationDocs.forEach((doc, idx) => {
          if (doc.documentType && doc.value) {
            const validation = validateDocument(doc.documentType, doc.value);
            if (!validation.isValid) {
              form.setError(`verificationDocuments.${idx}.value` as any, {
                type: 'manual',
                message: validation.message,
              });
              hasValidationErrors = true;
            }
          }
        });
        if (hasValidationErrors) {
          return;
        }
      }

      const cleanEmptyStrings = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(cleanEmptyStrings);
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && value.trim() === '') {
            cleaned[key] = undefined;
          } else if (typeof value === 'object' && value !== null) {
            cleaned[key] = cleanEmptyStrings(value);
          } else {
            cleaned[key] = value as any;
          }
        }
        return cleaned;
      };

      // Build a single documents array and include it only if valid entries exist
      const combinedDocs = [
        ...((currentVerificationDocs || []).map((doc: any) => ({
          documentType: doc.documentType,
          value: doc.value,
          verificationStatus: doc.verificationStatus ?? 'unverified',
          documentImages: Array.isArray(doc.documentImages)
            ? doc.documentImages.map((img: any) => ({ s3Filename: img.s3Filename }))
            : [],
        })) as any[]),
        ...((currentKycDocs || []).map((doc: any) => ({
          documentType: doc.documentType,
          value: doc.value,
          verificationStatus: doc.verificationStatus ?? 'unverified',
          documentImages: Array.isArray(doc.documentImages)
            ? doc.documentImages.map((img: any) => ({ s3Filename: img.s3Filename }))
            : [],
        })) as any[]),
      ].filter((d: any) => d.documentType && d.value);

      const outletPayload = cleanEmptyStrings({
        outletName: data.outletName,
        businessTypeId: data.businessTypeId,
        shortCode: data.shortCode,
        phoneNumber: `${data.phoneNumber}`,
        ...(isEditMode ? {} : { outletStatus: 'pending' as const }),
        pincode: parseInt(data.pincode),
        outletAddress: {
          streetAddress: data.outletAddress.streetAddress,
          location: {
            type: 'Point' as const,
            coordinates: [selectedCoordinates.lng, selectedCoordinates.lat] as [
              number,
              number,
            ],
          },
        },
        ...(data.billingAddress?.streetAddress ? {
          billingAddress: {
            streetAddress: data.billingAddress.streetAddress,
            location: {
              type: 'Point' as const,
              coordinates: selectedBillingCoordinates
              ? [selectedBillingCoordinates.lng, selectedBillingCoordinates.lat] as [number, number]
              : [0, 0] as [number, number],
            },
          }
        } : {}),
        bankDetails: data.bankDetails,
        ...(combinedDocs.length > 0 ? { verificationDocuments: combinedDocs } : {}),
        outletImages:
          data.outletImages ||
          uploadedS3FileNames.map((s3FileName) => ({
            s3Filename: s3FileName,
          })) ||
          [],
        email: data.email,
        ownerName: data.ownerName,
        totalPerson: (data as any).totalPerson || undefined,
        outletStoreSqFtId: data.outletStoreSqFtId,
        area: data.area,
        district: data.district,
        state: data.state,
        mappings: data.mappings,
        ...(isEditMode && selectedOutletStatus !== outletData?.outletStatus
          ? { outletStatus: selectedOutletStatus }
          : {}),
      });

      if (isEditMode) {
        toast.loading('Updating outlet...', { id: 'outlet-update' });
        await updateOutlet.mutateAsync(
          { outletId: outletId as string, data: outletPayload },
          {
            onSuccess: () => {
              toast.success('Outlet updated successfully', {
                id: 'outlet-update',
              });
              router.push(NavKeys.Outlets);
            },
          }
        );
      } else {
        toast.loading('Creating outlet...', { id: 'outlet-create' });
        await createOutlet.mutateAsync(outletPayload, {
          onSuccess: () => {
            toast.success('Outlet created successfully', {
              id: 'outlet-create',
            });
            router.push(NavKeys.Outlets);
          },
        });
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return {
    isEditMode,
    outletId: outletId as string | null,
    breadcrumb,
    outletQuery,
    outletData,
    warehouses,
    form,
    existingImages,
    setExistingImages,
    uploadedFiles,
    uploadedS3FileNames,
    handleOutletImagesChange,
    isPincodeLoading,
    selectedOutletStatus,
    setSelectedOutletStatus,
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
    handleStatusUpdate,
    onSubmit,
    createOutlet,
    updateOutlet,
    uploadMultipleFiles,
  } as const;
};
