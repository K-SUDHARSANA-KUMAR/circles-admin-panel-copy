'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  warehouseFormSchema,
  type WarehouseFormData,
} from '@/lib/schemas/warehouse-schema';
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { LocationPickerModal } from '@/components/modals/location-picker-modal';
import PincodeSelectionModal from '@/components/modals/pincode-selection-modal';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { RequirePermission } from '@/components/auth/require-permission';
import BreadcrumbHeader from '@/components/breadcrumb/breadcrumb';
import { getBreadcrumbData } from '@/constants/breadcrumb-config';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { formatWithLeadingZero } from '@/lib/utils';
import dynamic from 'next/dynamic';

import { PaginationState } from '@tanstack/react-table';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { MasterRecordDropdown } from '@/components/shared/master-record-dropdown-filter';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedValue } from '@/store/slices/masterRecordsSlice';
import {
  MasterRecord,
  MasterRecord,
  MasterRecordFilters,
} from '@/features/master-managment/types/master.types';
import { MasterRecordMultiSelect } from '@/components/shared/master-record-multi-select';
import { BeatOption } from '@/components/modals/beat-selection-modal';
import { BeatMultiSelectModal } from '@/components/modals/beat-multiselect-modal';


// Dynamic import for map component
const MapComponent = dynamic(
  () => import('@/components/modals/map-component'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 w-full items-center justify-center rounded-lg bg-gray-100">
        <div className="text-gray-500">Loading map...</div>
      </div>
    ),
  }
);

const WarehouseCreatePage = () => {
  return (
    <RequirePermission module="warehouse" action={['create', 'edit']}>
      <WarehouseCreateContent />
    </RequirePermission>
  );
};

const WarehouseCreateContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { selectedValues } = useAppSelector((state) => state.masterRecords);
  const mode = searchParams.get('mode');
  const warehouseId = searchParams.get('warehouseId');
  const { createWarehouse, updateWarehouse, warehouseById } = useWarehouse(
    warehouseId || undefined
  );

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPincodeModalOpen, setIsPincodeModalOpen] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Pincode selection state
  const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
  const [selectedPincodesPagination, setSelectedPincodesPagination] =
    useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });

  // PJP Access Mapping State
  const [selectedBeats, setSelectedBeats] = useState<BeatOption[]>([]);
  const [isBeatMultiSelectModalOpen, setIsBeatMultiSelectModalOpen] = useState(false);


  // Change detection state
  const [initialFormValues, setInitialFormValues] =
    useState<WarehouseFormData | null>(null);
  const [initialCoordinates, setInitialCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [initialPincodes, setInitialPincodes] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Filter states for main page
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');


  // AbortController ref for cancelling API calls
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build filters for pincode query (main page)
  const pincodeFilters: MasterRecordFilters = {};
  if (selectedState) {
    pincodeFilters.stateId = selectedState;
  }
  if (selectedDistrict) {
    pincodeFilters.districtId = selectedDistrict;
  }
  if (searchQuery) {
    pincodeFilters.search = {
      term: searchQuery,
      fields: ['pincode', 'area', 'districtName', 'stateName'],
    };
  }



  const isEditMode = mode === 'edit' || !!warehouseId;
  const breadcrumb = getBreadcrumbData(
    'warehouse',
    isEditMode ? 'edit' : 'create'
  );
  const isLoading = warehouseId ? warehouseById.isLoading : false;
  const isSubmitting = createWarehouse.isPending || updateWarehouse.isPending;

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      warehouseName: '',
      shortCode: '',
      address: '',
      latitude: undefined,
      longitude: undefined,
      channelId: '',
      warehouseTypeId: '',
      divisionId: '',
      zoneId: '',
      subZoneId: '',
      // PJP Mappings
      state: [],
      district: [],
      city: [],
      beat: [],
    },

  });

  // Function to check if there are any changes
  const checkForChanges = () => {
    if (!isEditMode) {
      // For create mode, always allow submission
      setHasChanges(true);
      return;
    }

    if (!initialFormValues || !initialCoordinates) {
      setHasChanges(false);
      return;
    }

    const currentValues = form.getValues();
    const currentCoordinates = selectedCoordinates;
    const currentPincodes = selectedPincodes;

    // Check form values
    const formChanged =
      currentValues.warehouseName !== initialFormValues.warehouseName ||
      (currentValues as any).shortCode !==
      (initialFormValues as any).shortCode ||
      currentValues.address !== initialFormValues.address ||
      currentValues.channelId !== initialFormValues.channelId ||
      currentValues.warehouseTypeId !== initialFormValues.warehouseTypeId ||
      currentValues.divisionId !== initialFormValues.divisionId ||
      currentValues.zoneId !== initialFormValues.zoneId ||
      currentValues.divisionId !== initialFormValues.divisionId ||
      currentValues.zoneId !== initialFormValues.zoneId ||
      currentValues.subZoneId !== initialFormValues.subZoneId ||
      // Check PJP Mappings changes (simplified check on length or stringify)
      JSON.stringify(currentValues.state) !== JSON.stringify(initialFormValues.state) ||
      JSON.stringify(currentValues.district) !== JSON.stringify(initialFormValues.district) ||
      JSON.stringify(currentValues.city) !== JSON.stringify(initialFormValues.city) ||
      JSON.stringify(currentValues.beat) !== JSON.stringify(initialFormValues.beat);

    // Check coordinates
    const coordinatesChanged =
      !currentCoordinates ||
      !initialCoordinates ||
      currentCoordinates.lat !== initialCoordinates.lat ||
      currentCoordinates.lng !== initialCoordinates.lng;

    // Check pincodes - handle case where initialPincodes might be empty array
    const pincodesChanged =
      currentPincodes.length !== initialPincodes.length ||
      (currentPincodes.length > 0 &&
        initialPincodes.length > 0 &&
        (!currentPincodes.every((pincode) =>
          initialPincodes.includes(pincode)
        ) ||
          !initialPincodes.every((pincode) =>
            currentPincodes.includes(pincode)
          ))) ||
      (currentPincodes.length > 0 && initialPincodes.length === 0) ||
      (currentPincodes.length === 0 && initialPincodes.length > 0);

    const hasChanges = formChanged || coordinatesChanged || pincodesChanged;
    setHasChanges(hasChanges);

    // Debug logging
    if (isEditMode) {
      console.log('Change detection:', {
        formChanged,
        coordinatesChanged,
        pincodesChanged,
        hasChanges,
        currentPincodes: selectedPincodes,
        initialPincodes: initialPincodes,
      });
    }
  };

  // Watch form changes and pincode changes
  useEffect(() => {
    const subscription = form.watch(() => {
      checkForChanges();
    });
    return () => subscription.unsubscribe();
  }, [
    form,
    selectedCoordinates,
    selectedPincodes,
    initialFormValues,
    initialCoordinates,
    initialPincodes,
    isEditMode,
  ]);

  // Watch pincode changes separately
  useEffect(() => {
    checkForChanges();
  }, [selectedPincodes, initialPincodes, isEditMode]);


  // Set up warehouse data for editing
  useEffect(() => {
    if (!isEditMode) {
      setPrefilled(true);
      return;
    }

    if (prefilled) return;

    if (warehouseId && warehouseById.data?.data) {
      const warehouse = warehouseById.data.data;
      console.log('Warehouse data for editing:', warehouse); // Debug log
      const coordinates = {
        lat: warehouse.address.location.coordinates[1],
        lng: warehouse.address.location.coordinates[0],
      };

      const warehousePincodes = (warehouse.mappings || []).map((item: any) =>
        String(item.pincode)
      );

      const formData = {
        warehouseName: warehouse.warehouseName,
        shortCode: (warehouse as any).shortCode || '',
        address: warehouse.address.streetAddress,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        channelId: warehouse.channelId || '',
        warehouseTypeId: warehouse.warehouseTypeId || '',
        divisionId: warehouse.divisionId || '',
        zoneId: warehouse.zoneId || '',
        subZoneId: warehouse.subZoneId || '',
      };

      console.log('Form data to reset:', formData); // Debug log

      // Update Redux state for master records FIRST
      if (warehouse.channelId) {
        dispatch(
          setSelectedValue({
            masterName: 'channel',
            value: warehouse.channelId,
          })
        );
      }
      if (warehouse.warehouseTypeId) {
        dispatch(
          setSelectedValue({
            masterName: 'warehouseType',
            value: warehouse.warehouseTypeId,
          })
        );
      }
      if (warehouse.divisionId) {
        dispatch(
          setSelectedValue({
            masterName: 'division',
            value: warehouse.divisionId,
          })
        );
      }
      if (warehouse.zoneId) {
        dispatch(
          setSelectedValue({
            masterName: 'zone',
            value: warehouse.zoneId,
          })
        );
      }
      if (warehouse.subZoneId) {
        dispatch(
          setSelectedValue({
            masterName: 'subZone',
            value: warehouse.subZoneId,
          })
        );
      }

      // Map PJP Mappings
      const mappings = warehouse.mappings || [];
      const stateMappings = (warehouse.state || []).map((s: any) => ({ stateId: s.stateId || s.id || s._id }));
      const districtMappings = (warehouse.district || []).map((d: any) => ({ districtId: d.districtId || d.id || d._id }));
      const cityMappings = (warehouse.city || []).map((c: any) => ({ cityId: c.cityId || c.id || c._id }));
      const beatMappings = (warehouse.beat || []).map((b: any) => ({ beatId: b.beatId || b.id || b._id }));

      // Update form data with PJP mappings
      formData.state = stateMappings;
      formData.district = districtMappings;
      formData.city = cityMappings;
      formData.beat = beatMappings;

      // Update selected beats state
      const beatOptions: BeatOption[] = (warehouse.beat || []).map((b: any) => {
        const beatId = b.beatId || b.id || b._id;
        const beatName = b.beatName || b.name || b.beat?.beatName || b.beat?.name || b.beatname || '-';
        return {
          beatId: String(beatId),
          beatName: String(beatName),
        };
      });
      setSelectedBeats(beatOptions);

      setSelectedCoordinates(coordinates);
      setSelectedPincodes(warehousePincodes);

      setInitialFormValues(formData);
      setInitialCoordinates(coordinates);
      setInitialPincodes(warehousePincodes);

      form.reset(formData, {
        keepErrors: false,
        keepDirty: false,
        keepTouched: false,
        keepIsSubmitted: false,
      });

      setPrefilled(true);
    }
  }, [isEditMode, prefilled, warehouseId, warehouseById.data, dispatch, form]);

  useEffect(() => {
    if (isEditMode) {
      setPrefilled(false);
    } else {
      setPrefilled(true);
    }
  }, [isEditMode, warehouseId]);

  useEffect(() => {
    if (isEditMode && initialFormValues) {
      const channelValue = form.getValues('channelId');
      const warehouseTypeValue = form.getValues('warehouseTypeId');
      const divisionValue = form.getValues('divisionId');
      const zoneValue = form.getValues('zoneId');
      const subzoneValue = form.getValues('subZoneId');

      if (channelValue && channelValue !== selectedValues.channel) {
        dispatch(
          setSelectedValue({ masterName: 'channel', value: channelValue })
        );
      }
      if (
        warehouseTypeValue &&
        warehouseTypeValue !== selectedValues.warehouseType
      ) {
        dispatch(
          setSelectedValue({
            masterName: 'warehouseType',
            value: warehouseTypeValue,
          })
        );
      }
      if (divisionValue && divisionValue !== selectedValues.division) {
        dispatch(
          setSelectedValue({
            masterName: 'division',
            value: divisionValue,
          })
        );
      }
      if (zoneValue && zoneValue !== selectedValues.zone) {
        dispatch(
          setSelectedValue({
            masterName: 'zone',
            value: zoneValue,
          })
        );
      }
      if (subzoneValue && subzoneValue !== selectedValues.subZone) {
        dispatch(
          setSelectedValue({
            masterName: 'subZone',
            value: subzoneValue,
          })
        );
      }
    }
  }, [isEditMode, initialFormValues, form, selectedValues, dispatch]);

  useEffect(() => {
    if (!warehouseId && !selectedCoordinates) {
      const defaultCoordinates = {
        lat: 10.3865296,
        lng: 78.0052919,
      };
      setSelectedCoordinates(defaultCoordinates);
    }
  }, [warehouseId, selectedCoordinates]);

  // Reset pagination when main page filters change
  useEffect(() => {
    setSelectedPincodesPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [selectedState, selectedDistrict, searchQuery]);


  // Cleanup effect to cancel API calls when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleLocationSelect = (coordinates: { lat: number; lng: number }, address?: string, pincode?: string) => {
    setSelectedCoordinates(coordinates);
    form.setValue('latitude', coordinates.lat);
    form.setValue('longitude', coordinates.lng);
    if (address) {
      form.setValue('address', address);
    }
  };

  const handleOpenPincodeModal = () => {
    const channelId = form.getValues('channelId');
    if (!channelId) {
      toast.error('Please select a channel first before mapping pincodes.');
      return;
    }
    setIsPincodeModalOpen(true);
  };

  const handleConfirmPincodeSelection = (pincodes: string[]) => {
    setSelectedPincodes([...pincodes]);
    setIsPincodeModalOpen(false);
  };

  const handleSelectedPincodesPaginationChange = (
    newPagination: PaginationState
  ) => {
    setSelectedPincodesPagination(newPagination);
  };


  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedDistrict('');
  };

  const handleDistrictChange = (value: string) => {
    setSelectedDistrict(value);
  };


  const handleSubmit = async () => {
    const isFormValid = await form.trigger();
    if (!isFormValid) {
      toast.error('Please fill in all required warehouse information fields.');
      return;
    }

    const formData = form.getValues();

    try {
      const coordinates: [number, number] = selectedCoordinates
        ? [selectedCoordinates.lng, selectedCoordinates.lat]
        : [78.0052919, 10.3865296];

      const payload = {
        warehouseName: formData.warehouseName,
        shortCode: (formData as any).shortCode,
        channelId: formData.channelId,
        warehouseTypeId: formData.warehouseTypeId,
        divisionId: formData.divisionId,
        zoneId: formData.zoneId,
        subZoneId: formData.subZoneId,
        mappings: selectedPincodes.map(pincode => ({ pincode })),
        // Include PJP Mappings
        state: formData.state,
        district: formData.district,
        city: formData.city,
        beat: formData.beat,
        address: {
          streetAddress: formData.address,
          location: {
            type: 'Point',
            coordinates,
          },
        },
      };

      if (isEditMode) {
        toast.loading('Updating warehouse...', { id: 'warehouse-action' });
        await updateWarehouse.mutateAsync({
          warehouseId: warehouseId!,
          data: payload,
        });
        toast.success('Warehouse updated successfully!', {
          id: 'warehouse-action',
        });
      } else {
        toast.loading('Creating warehouse...', { id: 'warehouse-action' });
        await createWarehouse.mutateAsync({
          data: payload,
          userId: user?.userId,
        });
        toast.success('Warehouse created successfully!', {
          id: 'warehouse-action',
        });
      }

      router.push('/warehouse-management/warehouse');
    } catch (error: any) {
      if (error?.response?.data?.message) {
        toast.error(error?.response?.data?.message, { id: 'warehouse-action' });
      } else {
        toast.error(
          `Failed to ${isEditMode ? 'update' : 'create'} warehouse. Please try again.`,
          { id: 'warehouse-action' }
        );
      }
    }
  };


  const selectedPincodeColumns: ColumnDef<MasterRecord>[] = [
    {
      id: 'sno',
      header: 'S.No',
      cell: ({ row }) =>
        formatWithLeadingZero(
          selectedPincodesPagination.pageIndex *
          selectedPincodesPagination.pageSize +
          row.index +
          1
        ),
    },
    {
      accessorKey: 'pincode',
      header: 'Pincode',
      cell: ({ row }) => {
        const pincode = row.getValue('pincode') as number;
        return <span className="font-medium">{pincode}</span>;
      },
    },
    {
      accessorKey: 'area',
      header: 'Area',
    },
    {
      accessorKey: 'districtName',
      header: 'District',
    },
    {
      accessorKey: 'stateName',
      header: 'State',
    },
  ];

  // Build filters for selected pincodes query
  const selectedPincodesFilters: MasterRecordFilters = {};
  if (selectedPincodes.length > 0) {
    selectedPincodesFilters.pincode = selectedPincodes;
  }
  // Apply additional filters to selected pincodes
  if (selectedState) {
    selectedPincodesFilters.stateId = selectedState;
  }
  if (selectedDistrict) {
    selectedPincodesFilters.districtId = selectedDistrict;
  }
  if (searchQuery) {
    selectedPincodesFilters.search = {
      term: searchQuery,
      fields: ['pincode', 'area', 'districtName', 'stateName'],
    };
  }

  // Fetch selected pincodes data from API
  const {
    records: selectedPincodesRecords,
    pagination: selectedPincodesPaginationData,
  } = useMasterRecords(
    selectedPincodes.length > 0 ? 'pincode' : '',
    undefined,
    selectedPincodesPagination.pageIndex * selectedPincodesPagination.pageSize,
    selectedPincodesPagination.pageSize,
    false,
    selectedPincodesFilters
  );

  // Fetch beat names from master record system if they are missing or still set to ID
  const shouldLookupBeats = selectedBeats.some((b) => !b.beatName || b.beatName === b.beatId || b.beatName === '-');
  const { records: lookupBeats } = useMasterRecords(
    shouldLookupBeats ? 'beat' : '',
    undefined,
    0,
    1000,
    true,
    selectedBeats.length > 0 ? { beatId: selectedBeats.map((b) => b.beatId) } : undefined,
    undefined,
    undefined,
    undefined,
    true // showAll
  );

  // Patch selected beats with names from master records if missing
  useEffect(() => {
    const rawData = lookupBeats.data as any;
    const items = Array.isArray(rawData) ? rawData : rawData?.items;
    
    if (items && Array.isArray(items) && items.length > 0) {
      const beatMap: Record<string, string> = {};
      items.forEach((b: any) => {
        const id = b.beatId || b._id || b.id;
        const name = b.beatName || b.name || b.beatname;
        if (id && name) {
          beatMap[id] = name;
        }
      });

      setSelectedBeats((prev) => {
        let changed = false;
        const next = prev.map((pb) => {
          if ((!pb.beatName || pb.beatName === '-') && beatMap[pb.beatId]) {
            changed = true;
            return { ...pb, beatName: beatMap[pb.beatId] };
          }
          return pb;
        });
        return changed ? next : prev;
      });
    }
  }, [lookupBeats.data]);

  if (isEditMode && isLoading) {
    return (
      <section className="flex h-full items-center justify-center">
        <Loading text="Loading warehouse data..." />
      </section>
    );
  }

  // In edit mode, wait until prefill completes to render the form UI
  if (isEditMode && warehouseId && warehouseById.data?.data && !prefilled) {
    return (
      <section className="flex h-full items-center justify-center">
        <Loading text="Preparing form..." />
      </section>
    );
  }

  if (warehouseById.error) {
    return (
      <section className="flex h-full items-center justify-center">
        <GenericError text="Error loading warehouse data. Please try again." />
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-white">
        <BreadcrumbHeader {...breadcrumb} />
      </div>

      {/* Warehouse Information Form */}
      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-6"
          key={warehouseId || 'new'}
        >
          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Warehouse Information
            </div>

            {/* Map Display */}
            <div className="mb-6 space-y-4">
              <div className="relative z-0 z-25 h-96 w-full overflow-hidden rounded-lg border">
                <MapComponent
                  onLocationSelect={() => { }} // Read-only for viewing
                  initialCoordinates={selectedCoordinates || undefined}
                  selectedCoordinates={selectedCoordinates}
                  readOnly={true}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="warehouseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Warehouse Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter warehouse name"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Short Code - after Warehouse Name */}
              <FormField
                control={form.control}
                name="shortCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter short code"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Address <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Enter warehouse address"
                          {...field}
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="tertiary"
                          onClick={() => setIsLocationModalOpen(true)}
                          disabled={isLoading}
                        >
                          <MapPin className="h-4 w-4" />
                          Pin Location
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouseTypeId"
                render={({ field }) => {
                  console.log('Warehouse Type field value:', field.value); // Debug log
                  return (
                    <FormItem>
                      <FormLabel>
                        Warehouse Type <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <MasterRecordDropdown
                          masterName="warehouseType"
                          value={field.value || ''}
                          onChange={(value) => {
                            form.setValue('warehouseTypeId', value, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                            console.log('Warehouse Type changed to:', value);
                          }}
                          placeholder="Select warehouse type"
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="divisionId"
                render={({ field }) => {
                  console.log('Division field value:', field.value); // Debug log
                  return (
                    <FormItem>
                      <FormLabel>
                        Division <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <MasterRecordDropdown
                          masterName="division"
                          value={field.value || ''}
                          onChange={(value) => {
                            form.setValue('divisionId', value, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                            console.log('Division changed to:', value);

                            if (value !== field.value) {
                              form.setValue('channelId', '', {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                              form.setValue('zoneId', '', {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                              form.setValue('subZoneId', '', {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                              dispatch(
                                setSelectedValue({
                                  masterName: 'channel',
                                  value: '',
                                })
                              );
                              dispatch(
                                setSelectedValue({
                                  masterName: 'zone',
                                  value: '',
                                })
                              );
                              dispatch(
                                setSelectedValue({
                                  masterName: 'subZone',
                                  value: '',
                                })
                              );
                            }
                          }}
                          placeholder="Select division"
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="channelId"
                render={({ field }) => {
                  console.log('Channel field value:', field.value); // Debug log
                  const divisionId = form.getValues('divisionId');
                  return (
                    <FormItem>
                      <FormLabel>
                        Channel <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <MasterRecordDropdown
                          masterName="channel"
                          value={field.value || ''}
                          onChange={(value) => {
                            form.setValue('channelId', value, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                            console.log('Channel changed to:', value);

                            // Clear child selections when channel changes
                            if (value !== field.value) {
                              form.setValue('zoneId', '', {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                              form.setValue('subZoneId', '', {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                              dispatch(
                                setSelectedValue({
                                  masterName: 'zone',
                                  value: '',
                                })
                              );
                              dispatch(
                                setSelectedValue({
                                  masterName: 'subZone',
                                  value: '',
                                })
                              );
                            }
                          }}
                          placeholder={
                            divisionId
                              ? 'Select channel'
                              : 'Select division first'
                          }
                          className="w-full"
                          disabled={!divisionId}
                          filters={divisionId ? { divisionId } : undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => {
                  console.log('Zone field value:', field.value); // Debug log
                  const channelId = form.getValues('channelId');
                  return (
                    <FormItem>
                      <FormLabel>
                        Zone <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <MasterRecordDropdown
                          masterName="zone"
                          value={field.value || ''}
                          onChange={(value) => {
                            form.setValue('zoneId', value, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                            console.log('Zone changed to:', value);

                            // Clear child selections when zone changes
                            if (value !== field.value) {
                              form.setValue('subZoneId', '', {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              });
                              dispatch(
                                setSelectedValue({
                                  masterName: 'subZone',
                                  value: '',
                                })
                              );
                            }
                          }}
                          placeholder={
                            channelId ? 'Select zone' : 'Select channel first'
                          }
                          className="w-full"
                          disabled={!channelId}
                          filters={channelId ? { channelId } : undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="subZoneId"
                render={({ field }) => {
                  console.log('Subzone field value:', field.value); // Debug log
                  const zoneId = form.getValues('zoneId');
                  return (
                    <FormItem>
                      <FormLabel>
                        Subzone <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <MasterRecordDropdown
                          masterName="subZone"
                          value={field.value || ''}
                          onChange={(value) => {
                            form.setValue('subZoneId', value, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                            console.log('Subzone changed to:', value);
                          }}
                          placeholder={
                            zoneId ? 'Select subzone' : 'Select zone first'
                          }
                          className="w-full"
                          disabled={!zoneId}
                          filters={zoneId ? { zoneId } : undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>

          {/* PJP Access Mappings */}
          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              PJP Access Mappings
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => {
                  const stateIds = field.value?.map((s) => s.stateId) || [];
                  return (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <MasterRecordMultiSelect
                          masterName="state"
                          value={stateIds}
                          onChange={(ids) => {
                            const newValue = ids.map((id) => ({ stateId: id }));
                            field.onChange(newValue);

                            // Allow child components to filter automatically based on selected states
                            if (ids.length === 0) {
                              form.setValue('district', []);
                              form.setValue('city', []);
                              form.setValue('beat', []);
                              setSelectedBeats([]);
                            }
                          }}
                          placeholder="Select states"
                          maxToShow={5}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="district"
                render={({ field }) => {
                  const districtIds = field.value?.map((d) => d.districtId) || [];
                  const selectedStates = form.watch('state') || [];
                  const selectedStateIds = selectedStates.map((s) => s.stateId);

                  return (
                    <FormItem>
                      <FormLabel>Districts</FormLabel>
                      <FormControl>
                        <MasterRecordMultiSelect
                          masterName="district"
                          value={districtIds}
                          onChange={(ids) => {
                            const newValue = ids.map((id) => ({ districtId: id }));
                            field.onChange(newValue);

                            if (ids.length === 0) {
                              form.setValue('city', []);
                              form.setValue('beat', []);
                              setSelectedBeats([]);
                            }
                          }}
                          placeholder="Select districts"
                          maxToShow={5}
                          filters={selectedStateIds.length > 0 ? { stateId: selectedStateIds } : undefined}
                          disabled={isLoading || selectedStateIds.length === 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => {
                  const cityIds = field.value?.map((c) => c.cityId) || [];
                  const selectedDistricts = form.watch('district') || [];
                  const selectedDistrictIds = selectedDistricts.map((d) => d.districtId);

                  return (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <MasterRecordMultiSelect
                          masterName="city"
                          value={cityIds}
                          onChange={(ids) => {
                            const newValue = ids.map((id) => ({ cityId: id }));
                            field.onChange(newValue);
                            if (ids.length === 0) {
                              form.setValue('beat', []);
                              setSelectedBeats([]);
                            }
                          }}
                          placeholder="Select cities"
                          maxToShow={5}
                          filters={selectedDistrictIds.length > 0 ? { districtId: selectedDistrictIds } : undefined}
                          disabled={isLoading || selectedDistrictIds.length === 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="beat"
                render={({ field }) => {
                  const displayBeats = selectedBeats.slice(0, 3);
                  const remainingCount = selectedBeats.length - 3;
                  // Beat selection depends on State OR District OR City being selected
                  // Usually logic is hierarchy, but let's enable if at least state is selected or just let modal handle filters
                  return (
                    <FormItem>
                      <FormLabel>Beat</FormLabel>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => setIsBeatMultiSelectModalOpen(true)}
                          disabled={isLoading}
                        >
                          <span className="flex items-center gap-1 flex-1 text-left">
                            {selectedBeats.length === 0 ? (
                              <span className="text-gray-500">Select beats</span>
                            ) : (
                              <span className="flex items-center gap-1 flex-wrap">
                                {displayBeats.map((beat, index) => (
                                  <span key={beat.beatId}>
                                    {beat.beatName || beat.beatId}
                                    {index < displayBeats.length - 1 && <span>, </span>}
                                  </span>
                                ))}
                                {remainingCount > 0 && (
                                  <span className="text-gray-500">+ {remainingCount} More</span>
                                )}
                              </span>
                            )}
                          </span>
                          <Search className="h-4 w-4 text-gray-400" />
                        </Button>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>
        </form>
      </Form>

      <div className="rounded-lg bg-white p-4">
        <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
          Map Warehouse Pincode
        </div>

        <div className="space-y-4">
          {/* Filters Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  State
                </label>
                <MasterRecordSelect
                  masterName="state"
                  value={selectedState}
                  onChange={handleStateChange}
                  placeholder="Filter by state"
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  District
                </label>
                <MasterRecordSelect
                  masterName="district"
                  value={selectedDistrict}
                  onChange={handleDistrictChange}
                  placeholder={
                    !selectedState
                      ? 'Filter by state first'
                      : 'Filter by district'
                  }
                  className="w-full"
                  filters={{ stateId: selectedState }}
                  disabled={!selectedState}
                />
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search Pincodes or Areas"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedPincodes.length > 0 ? (
                `Mapped pincodes: ${selectedPincodes.length}`
              ) : (
                <>
                  No pincodes mapped <span className="text-red-500">*</span>
                </>
              )}
            </div>
            <Button
              type="button"
              onClick={handleOpenPincodeModal}
              className="flex items-center gap-2"
              disabled={!form.getValues('channelId')}
            >
              {!form.getValues('channelId')
                ? 'Select Channel First'
                : selectedPincodes.length > 0
                  ? 'Update Pincodes'
                  : 'Map Pincodes'}
            </Button>
          </div>

          {/* Selected Pincodes Table */}
          {selectedPincodes.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium text-gray-700">
                Selected Pincodes
              </div>
              {selectedPincodesRecords.error ? (
                <div className="flex h-32 items-center justify-center">
                  <GenericError text="Error loading selected pincodes. Please try again." />
                </div>
              ) : (
                <DataTable
                  columns={selectedPincodeColumns}
                  data={selectedPincodesRecords.data || []}
                  pageCount={selectedPincodesPaginationData?.totalPages || 0}
                  totalItems={selectedPincodesPaginationData?.totalItems || 0}
                  onPaginationChange={handleSelectedPincodesPaginationChange}
                  manualPagination={true}
                  initialPagination={selectedPincodesPagination}
                  isLoading={selectedPincodesRecords.isLoading}
                  loadingText="Loading selected pincodes..."
                  tableId="warehouse-creation-table"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/warehouse-management/warehouse">Cancel</Link>
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-2"
          disabled={isSubmitting || isLoading || (isEditMode && !hasChanges)}
        >
          {isSubmitting
            ? isEditMode
              ? 'Updating...'
              : 'Creating...'
            : isEditMode
              ? 'Update Warehouse'
              : 'Create Warehouse'}
        </Button>
      </div>

      {/* Pincode Selection Modal */}
      <PincodeSelectionModal
        open={isPincodeModalOpen}
        onOpenChange={setIsPincodeModalOpen}
        selectedPincodes={selectedPincodes}
        onConfirm={handleConfirmPincodeSelection}
        channelId={form.getValues('channelId')}
      />

      <LocationPickerModal
        open={isLocationModalOpen}
        onOpenChange={setIsLocationModalOpen}
        onLocationSelect={handleLocationSelect}
        initialCoordinates={selectedCoordinates || undefined}
      />

      <BeatMultiSelectModal
        open={isBeatMultiSelectModalOpen}
        onCancel={() => setIsBeatMultiSelectModalOpen(false)}
        onConfirm={(beats) => {
          setSelectedBeats(beats);
          const beatValue = beats.map(b => ({ beatId: b.beatId }));
          form.setValue('beat', beatValue, { shouldValidate: true, shouldDirty: true });
          setIsBeatMultiSelectModalOpen(false);
        }}
        selectedBeats={selectedBeats}
      />
    </section>
  );
};

export default WarehouseCreatePage;
