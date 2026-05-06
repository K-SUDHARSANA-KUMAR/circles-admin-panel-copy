'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { LocationPickerModal } from '@/components/modals/location-picker-modal';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(
  () => import('@/components/modals/map-component'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-100">
        <div className="text-gray-500">Loading map...</div>
      </div>
    ),
  }
);
import { WarehouseMultiSelectSection } from '@/components/sections/warehouses-multiselect-section';
import { MasterRecordSelect } from '@/components/shared/master-record-select';
import { MasterRecordMultiSelect } from '@/components/shared/master-record-multi-select';
import { useWarehouse } from '@/features/warehouse-managment/hooks/useWarehouse';
import { StatusDropdown } from '@/components/shared/status-dropdown';
import type { BeatOption } from '@/components/modals/beat-selection-modal';
import { ReportingManagerModal } from '@/components/modals/reporting-manager-modal';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import GenericError from '@/components/ui/generic-error';
import { Input } from '@/components/ui/input';
import Loading from '@/components/ui/loading';
import { StyledMultiSelect } from '@/components/ui/styled-multi-select';
import { UserStatusEnum, UserTypeEnum } from '@/constants/enums/user.enums';
import { usePermissionGroups } from '@/features/user-managment/permission-groups/hooks/usePermissionGroups';
import { PermissionGroup } from '@/features/user-managment/permission-groups/types';
import { masterRecordsApi } from '@/features/master-managment/api/master-records';
import type { MasterRecord } from '@/features/master-managment/types/master.types';
import {
  useUser,
  useUsers,
} from '@/features/user-managment/users/hooks/useUsers';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMasterRecords } from '@/store/slices/masterRecordsSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, Home, MapPin, User, Edit, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import NavKeys from '@/constants/navkeys';
import BeatMultiSelectModal from '@/components/modals/beat-multiselect-modal';

interface Option {
  value: string;
  label: string;
}

const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phoneNumber: z
    .string()
    .min(10, 'Phone number is required')
    .max(10, 'Phone number must be 10 digits')
    .regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  secondaryPhoneNumber: z
    .string()
    .max(10, 'Secondary phone number must be 10 digits')
    .regex(/^\d{10}$/, 'Secondary phone number must be 10 digits')
    .optional()
    .or(z.literal('')),
  userAddress: z.object({
    streetAddress: z.string().optional(),
    location: z
      .object({
        type: z.literal('Point').optional(),
        coordinates: z.array(z.number()).length(2).or(z.array(z.any()).length(0)).optional(),
      })
      .optional(),
  }).optional(),
  warehouse: z
    .array(
      z.object({
        warehouseId: z.string().min(1, 'Warehouse is required'),
      })
    )
    .min(1, 'At least one warehouse is required'),
  division: z
    .array(
      z.object({
        divisionId: z.string().min(1, 'Division is required'),
      })
    )
    .optional(),
  plantId: z.string().min(1, 'Plant is required'),
  channel: z
    .array(
      z.object({
        channelId: z.string().min(1, 'Channel is required'),
      })
    )
    .optional(),
  zone: z
    .array(
      z.object({
        zoneId: z.string().min(1, 'Zone is required'),
      })
    )
    .optional(),
  subZone: z
    .array(
      z.object({
        subZoneId: z.string().min(1, 'Sub Zone is required'),
      })
    )
    .optional(),
  state: z
    .array(
      z.object({
        stateId: z.string().min(1, 'State is required'),
      })
    )
    .optional(),
  district: z
    .array(
      z.object({
        districtId: z.string().min(1, 'District is required'),
      })
    )
    .optional(),
  city: z
    .array(
      z.object({
        cityId: z.string().min(1, 'City is required'),
      })
    )
    .optional(),
  beat: z
    .array(
      z.object({
        beatId: z.string().min(1, 'Beat is required'),
      })
    )
    .optional(),
  pjpPlanTypeId: z.string().optional(),
  pjpPlanModeId: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required'),
  reportingDivisionId: z.string().min(1, 'Reporting Division is required'),
  reportingManagerId: z.string().min(1, 'Reporting Manager is required'),
  email: z.string().optional(),
  employeeCode: z.string().optional(),
  imeiNo: z.string().optional(),
  gradeId: z.string().min(1, 'Grade is required'),
  userType: z.nativeEnum(UserTypeEnum),
  roleId: z.string().optional(),
  status: z.string().optional(),
  doj: z.string().optional(),
  permissionGroup: z.array(z.string()).min(1, 'At least one permission group is required'),
  userName: z.string().optional(),
  password: z.string().optional(),
  beatDetails: z.object({
    beatId: z.string().optional(),
    beatName: z.string().optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.userType !== UserTypeEnum.TEMPORARY && (!data.roleId || data.roleId.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['roleId'],
      message: 'Role is required',
    });
  }
});

type UserFormData = z.infer<typeof userFormSchema>;

const UserCreatePage = () => {
  return (
    <RequirePermission module="users">
      <UserCreateContent />
    </RequirePermission>
  );
};

const UserCreateContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const userId = searchParams.get('userId');
  const isEditMode = mode === 'edit' && userId;
  const isViewMode = mode === 'view' && userId;
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isReportingManagerModalOpen, setIsReportingManagerModalOpen] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(!!isEditMode);
  const [originalFormData, setOriginalFormData] = useState<UserFormData | null>(null);
  const [selectedReportingManager, setSelectedReportingManager] = useState<{
    userId: string;
    name: string;
    employeeCode?: string;
  } | null>(null);
  const [isBeatModalOpen, setIsBeatModalOpen] = useState(false);
  const [isBeatMultiSelectModalOpen, setIsBeatMultiSelectModalOpen] = useState(false);
  const [selectedBeat, setSelectedBeat] = useState<{
    beatId: string;
    beatName: string;
  } | null>(null);
  const [selectedBeats, setSelectedBeats] = useState<BeatOption[]>([]);
  const { createUser, updateUser } = useUsers();
  const { data: userData, isLoading, error } = useUser(userId || '');
  const dispatch = useAppDispatch();
  const { recordMaps, records } = useAppSelector((state) => state.masterRecords);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      secondaryPhoneNumber: '',
      email: '',
      employeeCode: '',
      imeiNo: '',
      gradeId: '',
      userType: UserTypeEnum.TEMPORARY,
      roleId: '',
      userAddress: {
        streetAddress: '',
        location: {
          type: 'Point',
          coordinates: [0, 0] as [number, number],
        },
      },
      status: 'active',
      doj: '',
      permissionGroup: [],
      warehouse: [],
      division: [],
      plantId: '',
      channel: [],
      zone: [],
      subZone: [],
      state: [],
      district: [],
      city: [],
      beat: [],
      pjpPlanTypeId: '',
      pjpPlanModeId: '',
      departmentId: '',
      reportingDivisionId: '',
      reportingManagerId: '',
      userName: '',
      password: '',
    },
    mode: 'onChange',
  });

  const handlePJPClear = useCallback(() => {
    form.setValue('pjpPlanTypeId', '');
    form.setValue('pjpPlanModeId', '');
  }, [form]);

  const userType = useWatch({ control: form.control, name: 'userType' });
  const beatFormValue = useWatch({ control: form.control, name: 'beat' });
  const roleId = useWatch({ control: form.control, name: 'roleId' });

  // Get selected warehouse IDs from form
  const selectedWarehouseIds = useWatch({ control: form.control, name: 'warehouse' })?.map((w) => w.warehouseId) || [];

  // Fetch warehouse data for selected warehouses to get their mappings
  const { warehouses } = useWarehouse(undefined, {
    warehouseIds: selectedWarehouseIds,
    nonPaginated: true,
  });

  // Extract mapped IDs from selected warehouses
  const warehouseMappedIds = useMemo(() => {
    // The warehouses object has structure: { data: { data: { items: Warehouse[] } } }
    const warehouseItems = (warehouses?.data as any)?.data?.items || [];
    if (!warehouseItems.length || selectedWarehouseIds.length === 0) {
      return {
        stateIds: [],
        districtIds: [],
        cityIds: [],
        beatIds: [],
      };
    }

    const stateIdsSet = new Set<string>();
    const districtIdsSet = new Set<string>();
    const cityIdsSet = new Set<string>();
    const beatIdsSet = new Set<string>();

    warehouseItems.forEach((warehouse: any) => {
      // Extract state IDs
      if (Array.isArray(warehouse.state)) {
        warehouse.state.forEach((s: any) => {
          const stateId = s.stateId || s._id || s.id;
          if (stateId) stateIdsSet.add(String(stateId));
        });
      }

      // Extract district IDs
      if (Array.isArray(warehouse.district)) {
        warehouse.district.forEach((d: any) => {
          const districtId = d.districtId || d._id || d.id;
          if (districtId) districtIdsSet.add(String(districtId));
        });
      }

      // Extract city IDs
      if (Array.isArray(warehouse.city)) {
        warehouse.city.forEach((c: any) => {
          const cityId = c.cityId || c._id || c.id;
          if (cityId) cityIdsSet.add(String(cityId));
        });
      }

      // Extract beat IDs
      if (Array.isArray(warehouse.beat)) {
        warehouse.beat.forEach((b: any) => {
          const beatId = b.beatId || b._id || b.id;
          if (beatId) beatIdsSet.add(String(beatId));
        });
      }
    });

    return {
      stateIds: Array.from(stateIdsSet),
      districtIds: Array.from(districtIdsSet),
      cityIds: Array.from(cityIdsSet),
      beatIds: Array.from(beatIdsSet),
    };
  }, [warehouses?.data, selectedWarehouseIds]);

  const shouldFetchPermissionGroups: boolean =
    userType === UserTypeEnum.TEMPORARY ||
    ((userType === UserTypeEnum.PERMANENTFIELD ||
      userType === UserTypeEnum.PERMANENTNONFIELD) &&
      !!roleId);

  const permissionGroupPlaceholder = !userType
    ? 'Please select User Type'
    : userType === UserTypeEnum.TEMPORARY
      ? 'Select Permission Group'
      : !roleId
        ? 'Please select Role'
        : 'Select Permission Group';

  const isPermissionGroupDisabled = !userType
    ? true
    : userType === UserTypeEnum.TEMPORARY
      ? false
      : !roleId;

  const permissionGroupParams = useMemo(() => {
    if (userType === UserTypeEnum.TEMPORARY) {
      return { userType: UserTypeEnum.TEMPORARY };
    }
    if (
      (userType === UserTypeEnum.PERMANENTFIELD ||
        userType === UserTypeEnum.PERMANENTNONFIELD) &&
      roleId
    ) {
      return { userType, roleId };
    }
    return {};
  }, [userType, roleId]);

  const { permissionGroups } = usePermissionGroups(
    permissionGroupParams,
    shouldFetchPermissionGroups
  );
  const permissionGroupItems: Option[] = useMemo(() => {
    const groupList = Array.isArray(permissionGroups?.data?.data?.items)
      ? permissionGroups.data.data.items
      : [];
    console.log(permissionGroups);
    return (
      groupList?.map((group: PermissionGroup) => ({
        value: group.permissionGroupId,
        label: group.name,
      })) || []
    );
  }, [permissionGroups.data?.data?.items]);

  useEffect(() => {
    // Only run this effect if we're not in edit/view mode or if userData hasn't been loaded yet
    if ((!isEditMode && !isViewMode) || !userData) {
      form.setValue('permissionGroup', []);
      if (userType === UserTypeEnum.TEMPORARY) {
        form.setValue('roleId', '');
        form.clearErrors('roleId');
      }
    }
  }, [userType, roleId, form, isEditMode, isViewMode, userData]);

  useEffect(() => {
    if ((isEditMode || isViewMode) && userData) {

      const hasValidCoordinates = userData.userAddress?.location?.coordinates &&
        Array.isArray(userData.userAddress.location.coordinates) &&
        userData.userAddress.location.coordinates.length >= 2 &&
        userData.userAddress.location.coordinates[0] !== 0 &&
        userData.userAddress.location.coordinates[1] !== 0;

      const coordinates = hasValidCoordinates ? {
        lat: userData.userAddress.location.coordinates[1],
        lng: userData.userAddress.location.coordinates[0],
      } : null;

      let phoneNumber = userData.phoneNumber || '';
      if (phoneNumber.startsWith('+91')) {
        phoneNumber = phoneNumber.slice(3);
      }

      let secondaryPhoneNumber = (userData as any).alternatePhoneNo || '';
      if (secondaryPhoneNumber.startsWith('+91')) {
        secondaryPhoneNumber = secondaryPhoneNumber.slice(3);
      }

      const formattedDoj = userData.doj
        ? new Date(userData.doj).toISOString().split('T')[0]
        : '';

      const warehouseIds = Array.isArray(userData.mappings)
        ? userData.mappings
          .map((m: any) => {
            const id = m.warehouseId || m.warehouse_id || m.id || m._id;
            return id;
          })
          .filter(Boolean)
        : [];

      const divisionIds = Array.isArray((userData as any)?.division)
        ? (userData as any).division
          .map((m: any) => {
            const id = m.divisionId || m.division_id || m.id || m._id;
            return id;
          })
          .filter(Boolean)
        : [];

      const channelIds = Array.isArray((userData as any)?.channel)
        ? (userData as any).channel
          .map((m: any) => {
            const id = m.channelId || m.channel_id || m.id || m._id;
            return id;
          })
          .filter(Boolean)
        : [];

      const zoneIds = Array.isArray((userData as any)?.zone)
        ? (userData as any).zone
          .map((m: any) => {
            const id = m.zoneId || m.zone_id || m.id || m._id;
            return id;
          })
          .filter(Boolean)
        : [];

      const subZoneIds = Array.isArray((userData as any)?.subZone)
        ? (userData as any).subZone
          .map((m: any) => {
            const id = m.subZoneId || m.sub_zone_id || m.id || m._id;
            return id;
          })
          .filter(Boolean)
        : [];

      const stateIds = Array.isArray((userData as any)?.state)
        ? (userData as any).state
          .map((m: any) => {
            const id = m.stateId || m.state_id || m.id || m._id;
            return id;
          })
          .filter(Boolean)
        : [];

      const districtIds = Array.isArray((userData as any)?.district)
        ? (userData as any).district
          .map((m: any) => {
            const id = m.districtId || m.district_id || m.id || m._id;
            return id;
          })
          .filter(Boolean)
        : [];

      const cityIds = Array.isArray((userData as any)?.city)
        ? (userData as any).city
          .map((m: any) => {
            const id = m.cityId || m.city_id || m.id || m._id;
            return id;
          })
          .filter(Boolean)
        : [];

      const beatIds = Array.isArray((userData as any)?.beat)
        ? (userData as any).beat
          .map((m: any) => {
            const id = m.beatId || m.beat_id || m.id || m._id;
            return id;
          })
          .filter(Boolean)
        : [];

      const plantId = Array.isArray((userData as any)?.plant) && (userData as any).plant.length > 0
        ? (userData as any).plant[0].plantId || ''
        : (userData as any)?.plantId || '';

      const departmentId = (userData as any)?.departmentId || '';

      const roleId = userData.roleId?.toString() || '';

      const permissionGroupIds = Array.isArray(userData.permissionGroup)
        ? userData.permissionGroup.map((pg: any) =>
          typeof pg === 'string' ? pg : pg.permissionGroupId
        )
        : [];

      const reportingDetails = (userData as any)?.reportingDetails;
      if (reportingDetails) {
        setSelectedReportingManager({
          userId: reportingDetails.reportingId,
          name: reportingDetails.reportingName,
          employeeCode: reportingDetails.reportingEmployeeCode,
        });
      }

      const mapUserTypeFromApi = (apiUserType: string): UserTypeEnum => {
        switch (apiUserType) {
          case 'permanentField':
            return UserTypeEnum.PERMANENTFIELD;
          case 'permanentNonField':
            return UserTypeEnum.PERMANENTNONFIELD;
          case 'temporary':
            return UserTypeEnum.TEMPORARY;
          default:
            console.warn('Unknown userType from API:', apiUserType);
            return UserTypeEnum.TEMPORARY; // fallback
        }
      };

      const userTypeValue = mapUserTypeFromApi(userData.userType);

      const formData = {
        name: userData.name || '',
        phoneNumber: phoneNumber,
        secondaryPhoneNumber: secondaryPhoneNumber,
        email: userData.email || '',
        employeeCode: userData.employeeCode || '',
        imeiNo: userData.imeiNo || '',
        gradeId: userData.gradeId || '',
        userType: userTypeValue,
        roleId: roleId,
        userAddress: {
          streetAddress: userData.userAddress?.streetAddress || '',
          location: coordinates ? {
            type: 'Point' as const,
            coordinates: [coordinates.lng, coordinates.lat] as [
              number,
              number,
            ],
          } : {
            type: 'Point' as const,
            coordinates: [0, 0] as [number, number],
          },
        },
        status: userData.status || 'active',
        doj: formattedDoj,
        permissionGroup: permissionGroupIds,
        warehouse: warehouseIds.map((id: string) => ({ warehouseId: id })),
        division: divisionIds.map((id: string) => ({ divisionId: id })),
        plantId: plantId,
        channel: channelIds.map((id: string) => ({ channelId: id })),
        zone: zoneIds.map((id: string) => ({ zoneId: id })),
        subZone: subZoneIds.map((id: string) => ({ subZoneId: id })),
        state: stateIds.map((id: string) => ({ stateId: id })),
        district: districtIds.map((id: string) => ({ districtId: id })),
        city: cityIds.map((id: string) => ({ cityId: id })),
        beat: beatIds.map((id: string) => ({ beatId: id })),
        pjpPlanTypeId: (userData as any)?.pjpPlanTypeId || '',
        pjpPlanModeId: (userData as any)?.pjpPlanModeId || '',
        departmentId: departmentId,
        reportingDivisionId: (userData as any).reportingDivisionId || '',
        reportingManagerId:
          (userData as any)?.reportingDetails?.reportingId ||
          (userData as any).reportingTo ||
          '',
        userName: userData.userName || '',
        password: userData.password || '',
        ...(userData.beatDetails?.beatId && userData.beatDetails?.beatName ? {
          beatDetails: {
            beatId: userData.beatDetails.beatId,
            beatName: userData.beatDetails.beatName,
          },
        } : {}),
      };


      form.reset(formData);
      const beatOptionsFromUserData: BeatOption[] = Array.isArray((userData as any)?.beat)
        ? (userData as any).beat
          .map((beatRecord: any): BeatOption | null => {
            const beatId =
              beatRecord?.beatId ||
              beatRecord?.beat_id ||
              beatRecord?.id ||
              beatRecord?._id;

            if (!beatId) {
              return null;
            }

            const beatNameCandidate =
              beatRecord?.beatName ||
              beatRecord?.name ||
              beatRecord?.beat?.beatName ||
              '';

            return {
              beatId: String(beatId),
              beatName: beatNameCandidate ? String(beatNameCandidate) : String(beatId),
              beatCode: beatRecord?.beatCode ? String(beatRecord.beatCode) : undefined,
              stateId: beatRecord?.stateId ? String(beatRecord.stateId) : undefined,
              districtId: beatRecord?.districtId ? String(beatRecord.districtId) : undefined,
            };
          })
          .filter((beatOption: BeatOption | null): beatOption is BeatOption =>
            Boolean(beatOption?.beatId)
          )
        : [];

      setSelectedBeats(beatOptionsFromUserData);

      const beatId = userData.beatDetails?.beatId;
      const beatName = userData.beatDetails?.beatName;
      if (beatId && beatName) {
        setSelectedBeat({
          beatId: beatId,
          beatName: beatName,
        });
      } else {
        setSelectedBeat(null);
      }

      if (isViewMode) {
        setOriginalFormData(formData);
      }

      setTimeout(() => {
        form.setValue('userType', userTypeValue, {
          shouldValidate: true,
          shouldDirty: false,
          shouldTouch: false
        });

      }, 100);

      if (coordinates) {
        setSelectedCoordinates(coordinates);
      }
    }
  }, [isEditMode, isViewMode, userData, form]);

  const handleLocationSelect = (
    coordinates: { lat: number; lng: number },
    address?: string,
    _pincode?: string
  ) => {
    setSelectedCoordinates(coordinates);
    if (address) {
      form.setValue('userAddress.streetAddress', address, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
    form.setValue(
      'userAddress.location.coordinates',
      [coordinates.lng, coordinates.lat] as [number, number],
      {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      }
    );
  };

  const handleClearCoordinates = () => {
    setSelectedCoordinates(null);
    form.setValue('userAddress.location.coordinates', [], {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleEditToggle = () => {
    if (!isEditing && originalFormData) {
      setOriginalFormData(form.getValues());
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    if (originalFormData) {
      form.reset(originalFormData);
      if (originalFormData.userAddress?.location?.coordinates) {
        setSelectedCoordinates({
          lat: originalFormData.userAddress.location.coordinates[1],
          lng: originalFormData.userAddress.location.coordinates[0],
        });
      } else {
        setSelectedCoordinates(null);
      }
    }
    setIsEditing(false);
  };

  const handleReportingManagerSelect = (managerId: string | undefined, managerData?: any) => {
    if (managerId && managerData) {
      setSelectedReportingManager({
        userId: managerId,
        name: managerData.name,
        employeeCode: managerData.employeeCode,
      });
    } else if (managerId) {
      setSelectedReportingManager({
        userId: managerId,
        name: 'Loading...',
        employeeCode: undefined,
      });
    } else {
      setSelectedReportingManager(null);
    }
    form.setValue('reportingManagerId', managerId || '');
  };

  const handleReportingManagerConfirm = () => {
    const selectedManagerId = form.watch('reportingManagerId');
    if (selectedManagerId && selectedReportingManager?.userId === selectedManagerId) {
    }
    setIsReportingManagerModalOpen(false);
  };

  const handleBeatSelect = (beatId: string | undefined, beatData?: {
    beatId: string;
    beatName: string;
  }) => {
    if (beatId && beatData) {
      setSelectedBeat(beatData);
      form.setValue('beatDetails.beatId', beatId);
      form.setValue('beatDetails.beatName', beatData.beatName);
    } else {
      setSelectedBeat(null);
      form.setValue('beatDetails.beatId', undefined);
      form.setValue('beatDetails.beatName', undefined);
    }
  };

  const handleBeatConfirm = () => {
    setIsBeatModalOpen(false);
  };

  const handleBeatCancel = () => {
    setIsBeatModalOpen(false);
  };

  const handleRemoveBeat = () => {
    setSelectedBeat(null);
    form.setValue('beatDetails.beatId', undefined);
    form.setValue('beatDetails.beatName', undefined);
  };

  const handleBeatMultiSelectConfirm = (beats: BeatOption[]) => {
    setSelectedBeats(beats);
    const beatFormValue = beats.map((beat) => ({ beatId: beat.beatId }));
    form.setValue('beat', beatFormValue);
    setIsBeatMultiSelectModalOpen(false);
  };

  const handleBeatMultiSelectCancel = () => {
    setIsBeatMultiSelectModalOpen(false);
  };

  useEffect(() => {
    const beatIds = (beatFormValue || []).map((beatItem) => beatItem.beatId);

    if (beatIds.length === 0) {
      setSelectedBeats([]);
      return;
    }

    setSelectedBeats((previousBeats) => {
      const previousBeatMap = previousBeats.reduce<Record<string, BeatOption>>((accumulator, beat) => {
        if (beat?.beatId) {
          accumulator[beat.beatId] = beat;
        }
        return accumulator;
      }, {});

      return beatIds.map((beatId) => {
        if (!beatId) {
          return { beatId: '', beatName: '' };
        }

        const beatFromMap = recordMaps.beat?.[beatId];
        if (beatFromMap?.beatName) {
          return {
            beatId,
            beatName: String(beatFromMap.beatName),
            beatCode: beatFromMap.beatCode ? String(beatFromMap.beatCode) : undefined,
            stateId: beatFromMap.stateId ? String(beatFromMap.stateId) : undefined,
            districtId: beatFromMap.districtId ? String(beatFromMap.districtId) : undefined,
          };
        }

        const beatFromRecords = records.beat?.find(
          (beatRecord: any) => (beatRecord.beatId || beatRecord._id || beatRecord.id) === beatId
        );
        if (beatFromRecords) {
          return {
            beatId,
            beatName: String(beatFromRecords.beatName || beatFromRecords.name || ''),
            beatCode: beatFromRecords.beatCode ? String(beatFromRecords.beatCode) : undefined,
            stateId: beatFromRecords.stateId ? String(beatFromRecords.stateId) : undefined,
            districtId: beatFromRecords.districtId ? String(beatFromRecords.districtId) : undefined,
          };
        }

        if (previousBeatMap[beatId]?.beatName) {
          return previousBeatMap[beatId];
        }

        return {
          beatId,
          beatName: beatId,
        };
      });
    });
  }, [beatFormValue, recordMaps.beat, records.beat]);

  useEffect(() => {
    const beatIds = (beatFormValue || [])
      .map((beatItem) => beatItem.beatId)
      .filter((beatId): beatId is string => Boolean(beatId));

    if (beatIds.length === 0) {
      return;
    }

    const beatsMissingNames = beatIds.filter((beatId) => {
      if (!beatId) {
        return false;
      }

      const beatFromMap = recordMaps.beat?.[beatId];
      if (beatFromMap?.beatName) {
        return false;
      }

      const beatFromRecords = records.beat?.find(
        (beatRecord: any) => (beatRecord.beatId || beatRecord._id || beatRecord.id) === beatId
      );

      if (beatFromRecords?.beatName || beatFromRecords?.name) {
        return false;
      }

      const beatFromSelection = selectedBeats.find(
        (beatOption) =>
          beatOption.beatId === beatId &&
          Boolean(beatOption.beatName) &&
          beatOption.beatName !== beatId
      );

      return !beatFromSelection;
    });

    if (beatsMissingNames.length === 0) {
      return;
    }

    let isCancelled = false;

    const hydrateBeatDetails = async () => {
      try {
        const fetchedBeats = await Promise.all(
          beatsMissingNames.map((beatId) =>
            masterRecordsApi
              .getById('beat', beatId)
              .catch((error) => {
                console.error('Failed to fetch beat by id:', beatId, error);
                return null;
              })
          )
        );

        if (isCancelled) {
          return;
        }

        const validBeats = fetchedBeats.filter(Boolean) as MasterRecord[];

        if (validBeats.length === 0) {
          return;
        }

        const normalizedOptions = validBeats.reduce<BeatOption[]>((accumulator, beatRecord) => {
          const beatIdentifier = (beatRecord.beatId || beatRecord._id || beatRecord.id) as
            | string
            | undefined;

          if (!beatIdentifier) {
            return accumulator;
          }

          accumulator.push({
            beatId: String(beatIdentifier),
            beatName: String(beatRecord.beatName || beatRecord.name || beatIdentifier),
            beatCode: beatRecord.beatCode ? String(beatRecord.beatCode) : undefined,
            stateId: beatRecord.stateId ? String(beatRecord.stateId) : undefined,
            districtId: beatRecord.districtId ? String(beatRecord.districtId) : undefined,
          });

          return accumulator;
        }, []);

        if (normalizedOptions.length > 0) {
          setSelectedBeats((previousBeats) => {
            const mappedBeats = previousBeats.reduce<Record<string, BeatOption>>((accumulator, beat) => {
              if (beat?.beatId) {
                accumulator[beat.beatId] = beat;
              }
              return accumulator;
            }, {});

            normalizedOptions.forEach((beatOption) => {
              mappedBeats[beatOption.beatId] = beatOption;
            });

            return beatIds.map(
              (beatId) => mappedBeats[beatId] || { beatId, beatName: beatId }
            );
          });
        }

        const existingBeatRecords = Array.isArray(records.beat) ? records.beat : [];
        const mergedRecords = [...existingBeatRecords];

        validBeats.forEach((beatRecord) => {
          const beatIdentifier = beatRecord.beatId || beatRecord._id || beatRecord.id;
          if (!beatIdentifier) {
            return;
          }

          const existingIndex = mergedRecords.findIndex(
            (existingBeat: any) =>
              (existingBeat.beatId || existingBeat._id || existingBeat.id) === beatIdentifier
          );

          if (existingIndex >= 0) {
            mergedRecords[existingIndex] = {
              ...mergedRecords[existingIndex],
              ...beatRecord,
            };
          } else {
            mergedRecords.push(beatRecord);
          }
        });

        dispatch(
          setMasterRecords({
            masterName: 'beat',
            records: mergedRecords as MasterRecord[],
          })
        );
      } catch (error) {
        console.error('Error hydrating beat details:', error);
      }
    };

    hydrateBeatDetails();

    return () => {
      isCancelled = true;
    };
  }, [beatFormValue, recordMaps.beat, records.beat, selectedBeats, dispatch]);

  const scrollToFirstError = () => {
    // Look for error messages in the form
    const errorSelectors = [
      '[data-invalid="true"]',
      '.text-destructive',
      '[aria-invalid="true"]',
      '[role="alert"]',
      '.text-red-500',
      '.text-red-600'
    ];

    let firstError = null;
    for (const selector of errorSelectors) {
      firstError = document.querySelector(selector);
      if (firstError) break;
    }

    if (firstError) {
      // Find the parent form field container
      const formField = firstError.closest('[data-form-field]') ||
        firstError.closest('.space-y-6 > div') ||
        firstError.closest('div[class*="grid"]') ||
        firstError.parentElement;

      const targetElement = formField || firstError;

      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      // Try to focus the input field if it exists
      const inputField = targetElement.querySelector('input, select, textarea, [role="combobox"]');
      if (inputField && inputField instanceof HTMLElement) {
        setTimeout(() => {
          inputField.focus();
          inputField.click(); // For dropdowns and custom components
        }, 200);
      }
    } else {
      // Fallback: scroll to top of form
      const formElement = document.querySelector('form');
      if (formElement) {
        formElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      if (!isEditMode && !(isViewMode && isEditing) && !selectedCoordinates) {
        form.setError('userAddress.location.coordinates', {
          type: 'manual',
          message: 'Please select a location on the map',
        });
        return;
      }

      const {
        warehouse,
        division,
        channel,
        zone,
        subZone,
        state,
        district,
        city,
        beat,
        doj,
        pjpPlanTypeId,
        pjpPlanModeId,
        ...rest
      } = data;
      const userPayload: any = {
        ...rest,
        phoneNumber: `+91${data.phoneNumber}`,
        alternatePhoneNo: data.secondaryPhoneNumber ? `+91${data.secondaryPhoneNumber}` : undefined,
        userAddress: {
          ...data.userAddress,
          location: selectedCoordinates
            ? {
              type: 'Point' as const,
              coordinates: [selectedCoordinates.lng, selectedCoordinates.lat] as [
                number,
                number,
              ],
            }
            : {
              type: 'Point' as const,
              coordinates: [] as [],
            },
        },
        mappings: Array.isArray(warehouse)
          ? warehouse.map((w) => ({ warehouseId: w.warehouseId }))
          : [],
        division: Array.isArray(division)
          ? division.map((d) => ({ divisionId: d.divisionId }))
          : [],
        plantId: data.plantId || undefined,
        channel: Array.isArray(channel)
          ? channel.map((c) => ({ channelId: c.channelId }))
          : [],
        zone: Array.isArray(zone)
          ? zone.map((z) => ({ zoneId: z.zoneId }))
          : [],
        subZone: Array.isArray(subZone)
          ? subZone.map((sz) => ({ subZoneId: sz.subZoneId }))
          : [],
        state: Array.isArray(state)
          ? state.map((s) => ({ stateId: s.stateId }))
          : [],
        district: Array.isArray(district)
          ? district.map((d) => ({ districtId: d.districtId }))
          : [],
        city: Array.isArray(city)
          ? city.map((c) => ({ cityId: c.cityId }))
          : [],
        beat: Array.isArray(beat)
          ? beat.map((b) => ({ beatId: b.beatId }))
          : [],
        pjpPlanTypeId: pjpPlanTypeId || undefined,
        pjpPlanModeId: pjpPlanModeId || undefined,
        departmentId: data.departmentId || undefined,
        reportingTo: data.reportingManagerId || undefined,
        ...(data.beatDetails?.beatId && data.beatDetails?.beatName ? {
          beatDetails: {
            beatId: data.beatDetails.beatId,
            beatName: data.beatDetails.beatName,
          },
        } : {}),
      };
      if (isEditMode || (isViewMode && isEditing)) {
        delete userPayload.employeeCode;
        toast.loading('Updating user...', { id: 'user-action' });
        await updateUser.mutateAsync({ userId: userId!, data: userPayload });
        toast.success('User updated successfully!', { id: 'user-action' });
      } else {
        toast.loading('Creating user...', { id: 'user-action' });
        await createUser.mutateAsync(userPayload);
        toast.success('User created successfully!', { id: 'user-action' });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push(NavKeys.Users);
    } catch (err: any) {
      console.error('Error:', err);

      let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} user. Please try again.`;

      if (err?.response?.data?.message && typeof err.response.data.message === 'string') {
        errorMessage = err.response.data.message;
      } else if (err?.message && typeof err.message === 'string') {
        errorMessage = err.message;
      }

      toast.error(errorMessage, {
        id: 'user-action',
      });
    }
  };

  if ((isEditMode || isViewMode) && isLoading) {
    return (
      <section className="flex h-full items-center justify-center">
        <Loading text="Loading user data..." />
      </section>
    );
  }

  if ((isEditMode || isViewMode) && error) {
    return (
      <section className="flex h-full items-center justify-center">
        <GenericError text="Error loading user data. Please try again." />
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href={NavKeys.Users}
                className="flex items-center gap-1"
              >
                <Home className="h-3 w-3" /> Users
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {isEditMode || (isViewMode && isEditing) ? 'Edit User' : isViewMode ? 'View User' : 'Create User'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={NavKeys.Users}
              className="hover:bg-freshleaf/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">
                {isEditMode || (isViewMode && isEditing) ? 'Edit User' : isViewMode ? 'View User' : 'Create New User'}
              </h1>
              <p className="text-sm text-neutral-500">
                {isEditMode || (isViewMode && isEditing)
                  ? 'Update user information'
                  : isViewMode
                    ? 'View user information'
                    : 'Provide information to create a user'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isViewMode && !isEditing && (
              <Button
                variant="outline"
                onClick={handleEditToggle}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {isViewMode && isEditing && (
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="flex items-center gap-2"
              >
                Cancel
              </Button>
            )}
            <div className="bg-freshleaf/10 w-fit rounded-full p-2">
              <User className="text-freshleaf h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form
          key={isEditMode ? `edit-${userId}` : 'create'}
          onSubmit={form.handleSubmit(
            (data) => {
              onSubmit(data);
            },
            (errors) => {
              const isUpdateMode = isEditMode || (isViewMode && isEditing);
              const coordinatesError = errors?.userAddress?.location?.coordinates;
              const hasOnlyEmptyCoordinatesError =
                isUpdateMode &&
                coordinatesError &&
                Object.keys(errors).length === 1;

              if (!hasOnlyEmptyCoordinatesError) {
                setTimeout(scrollToFirstError, 100);
              }
            }
          )}
          className="space-y-6"
        >
          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Basic Information
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Full Name <span style={{ color: 'red' }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter full name"
                        {...field}
                        disabled={!!(isViewMode && !isEditing)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Phone Number <span style={{ color: 'red' }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="border-input focus-within:border-freshleaf focus-within:ring-freshleaf/40 flex overflow-hidden rounded-md border bg-white transition-[color,box-shadow] focus-within:ring-[3px] focus-within:outline-none">
                        <span className="border-input flex items-center border-r bg-gray-50 px-2 text-gray-500 select-none">
                          +91
                        </span>
                        <Input
                          {...field}
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          pattern="\d{10}"
                          placeholder="Enter phone number"
                          className="rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={field.value}
                          disabled={!!(isViewMode && !isEditing)}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\D/g, '')
                              .slice(0, 10);
                            field.onChange(val);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondaryPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Phone Number</FormLabel>
                    <FormControl>
                      <div className="border-input focus-within:border-freshleaf focus-within:ring-freshleaf/40 flex overflow-hidden rounded-md border bg-white transition-[color,box-shadow] focus-within:ring-[3px] focus-within:outline-none">
                        <span className="border-input flex items-center border-r bg-gray-50 px-2 text-gray-500 select-none">
                          +91
                        </span>
                        <Input
                          {...field}
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          pattern="\d{10}"
                          placeholder="Enter secondary phone number"
                          className="rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={field.value}
                          disabled={!!(isViewMode && !isEditing)}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\D/g, '')
                              .slice(0, 10);
                            field.onChange(val);
                          }}
                        />
                      </div>
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email"
                        {...field}
                        disabled={!!(isViewMode && !isEditing)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employeeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isEditMode ? (userData?.employeeCode || 'Employee code') : 'Enter employee code'}
                        {...field}
                        disabled={!!(isEditMode || (isViewMode && !isEditing))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imeiNo"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1">
                      <FormLabel>IMEI Number</FormLabel>
                      <div className="group relative">
                        <svg
                          className="h-4 w-4 text-gray-400 cursor-help"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                          IMEI number will be captured by the user when they login first time. To switch devices, clear the IMEI number and ask user to login on another device.
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="IMEI number"
                          {...field}
                          disabled
                        />
                        {field.value && (
                          <button
                            type="button"
                            onClick={() => field.onChange('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            title="Clear IMEI number"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <FormField
                control={form.control}
                name="doj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Joining</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        disabled={!!(isViewMode && !isEditing)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>

                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <StatusDropdown
                        className="w-full"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select status"
                        statusEnum={UserStatusEnum}
                        statusLabels={{
                          [UserStatusEnum.ACTIVE]: 'Active',
                          [UserStatusEnum.INACTIVE]: 'Inactive',
                          [UserStatusEnum.TERMINATED]: 'Terminated',
                        }}
                        excludeStatuses={
                          isEditMode ? [] : [UserStatusEnum.TERMINATED]
                        }
                        disabled={!!(isViewMode && !isEditing)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Department <span style={{ color: 'red' }}>*</span></FormLabel>
                      <FormControl>
                        <MasterRecordSelect
                          masterName="department"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select department"
                          className="w-full"
                          disabled={!!(isViewMode && !isEditing)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />


              <FormField
                control={form.control}
                name="gradeId"
                render={({ field }) => {
                  return (
                    <FormItem>

                      <FormLabel>Grade <span style={{ color: 'red' }}>*</span></FormLabel>
                      <MasterRecordSelect
                        masterName="grade"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select grade"
                        className="w-full"
                        disabled={!!(isViewMode && !isEditing)}
                      />
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="reportingDivisionId"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Reporting Division <span style={{ color: 'red' }}>*</span></FormLabel>
                      <FormControl>
                        <MasterRecordSelect
                          masterName="reportingDivision"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select reporting division"
                          className="w-full"
                          disabled={!!(isViewMode && !isEditing)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="reportingManagerId"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Reporting Manager <span style={{ color: 'red' }}>*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div
                            className={`flex items-center justify-between border rounded-md px-3 py-2 bg-white cursor-pointer hover:bg-gray-50 transition-colors ${(isViewMode && !isEditing) ? 'cursor-not-allowed opacity-50' : ''}`}
                            onClick={() => {
                              if (!(isViewMode && !isEditing)) {
                                setIsReportingManagerModalOpen(true);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {selectedReportingManager ? (
                                <>
                                  <span className="text-sm font-medium">{selectedReportingManager.name}</span>
                                  {selectedReportingManager.employeeCode && (
                                    <span className="text-xs text-gray-500">
                                      ({selectedReportingManager.employeeCode})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-sm text-gray-500">Select reporting manager</span>
                              )}
                            </div>
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="plantId"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Plant <span style={{ color: 'red' }}>*</span></FormLabel>
                      <FormControl>
                        <MasterRecordSelect
                          masterName="plant"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select plant"
                          className="w-full"
                          disabled={!!(isViewMode && !isEditing)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />


              <FormField
                control={form.control}
                name="userType"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>User Type <span style={{ color: 'red' }}>*</span></FormLabel>
                      <StatusDropdown
                        className="w-full"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select user type"
                        statusEnum={UserTypeEnum}
                        statusLabels={{
                          [UserTypeEnum.TEMPORARY]: 'Temporary',
                          [UserTypeEnum.PERMANENTFIELD]: 'Permanent Field',
                          [UserTypeEnum.PERMANENTNONFIELD]:
                            'Permanent Non-Field',
                        }}
                        disabled={!!(!isEditMode || (isViewMode && !isEditing))}
                      />
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {userType !== UserTypeEnum.TEMPORARY && (
                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel>Role <span style={{ color: 'red' }}>*</span></FormLabel>
                        <FormControl>
                          <MasterRecordSelect
                            masterName="role"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select role"
                            disabled={!!(isViewMode && !isEditing)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

              <FormField
                control={form.control}
                name="permissionGroup"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Permission Group <span style={{ color: 'red' }}>*</span></FormLabel>
                    <FormControl>
                      <StyledMultiSelect
                        {...field}
                        maxToShow={4}
                        options={permissionGroupItems}
                        isMulti
                        value={permissionGroupItems.filter((opt) =>
                          field.value?.includes(opt.value)
                        )}
                        onChange={(selected: Option[]) =>
                          field.onChange(selected.map((opt) => opt.value))
                        }
                        isDisabled={!!(isPermissionGroupDisabled || (isViewMode && !isEditing))}
                        isLoading={permissionGroups.isLoading}
                        placeholder={permissionGroupPlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              Address Information
            </div>
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="userAddress.streetAddress"
                  render={({ field }) => (
                    <FormItem className="gap-0">
                      <div className="mb-1 flex items-center justify-between">
                        <FormLabel className="mb-0">
                          Address <span style={{ color: 'red' }}>*</span>
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="bg-freshleaf/20 text-freshleaf flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setIsLocationModalOpen(true)}
                            disabled={!!(isViewMode && !isEditing)}
                          >
                            <MapPin className="h-2.5 w-2.5" />
                            Pin Location
                          </button>
                          {selectedCoordinates && (isEditMode || (isViewMode && isEditing)) && (
                            <button
                              type="button"
                              className="bg-red-100 text-red-600 hover:bg-red-200 flex cursor-pointer items-center justify-center rounded-md px-1.5 py-0.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              onClick={handleClearCoordinates}
                              disabled={!!(isViewMode && !isEditing)}
                              title="Clear location coordinates"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Enter address"
                          {...field}
                          disabled={!!(isViewMode && !isEditing)}
                        />
                      </FormControl>
                      <FormMessage />
                      {!selectedCoordinates && !isEditMode && !(isViewMode && isEditing) && (
                        <p className="text-destructive mt-1 text-sm">
                          Location is required. Please select a location on the map.
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              {/* Map Display */}
              <div className="z-25 h-64 w-full overflow-hidden rounded-lg border lg:w-[46%]">
                {selectedCoordinates ? (
                  <MapComponent
                    onLocationSelect={() => { }}
                    initialCoordinates={selectedCoordinates}
                    selectedCoordinates={selectedCoordinates}
                    readOnly={true}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Location required
                      </p>
                      <p className="text-xs text-gray-400">
                        Click "Pin Location" to select coordinates
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              User Access Mappings
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="division"
                render={({ field }) => {
                  const divisionIds = field.value?.map((d) => d.divisionId) || [];
                  return (
                    <FormItem>
                      <FormLabel>Division</FormLabel>
                      <FormControl>
                        <MasterRecordMultiSelect
                          masterName="division"
                          value={divisionIds}
                          onChange={(ids) => {
                            const newValue = ids.map((id) => ({ divisionId: id }));
                            field.onChange(newValue);

                            if (ids.length === 0) {
                              form.setValue('channel', []);
                              form.setValue('zone', []);
                              form.setValue('subZone', []);
                              form.setValue('warehouse', []);
                            }
                          }}
                          placeholder="Select divisions"
                          maxToShow={5}
                          disabled={!!(isViewMode && !isEditing)}
                          skipStoreUpdate={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => {
                  const channelIds = field.value?.map((c) => c.channelId) || [];
                  const selectedDivisionIds = form.watch('division')?.map((d) => d.divisionId) || [];
                  return (
                    <FormItem>
                      <FormLabel>Channel</FormLabel>
                      <FormControl>
                        <MasterRecordMultiSelect
                          masterName="channel"
                          value={channelIds}
                          onChange={(ids) => {
                            const newValue = ids.map((id) => ({ channelId: id }));
                            field.onChange(newValue);
                            if (ids.length === 0) {
                              form.setValue('zone', []);
                              form.setValue('subZone', []);
                            }
                          }}
                          placeholder="Select channels"
                          maxToShow={5}
                          filters={selectedDivisionIds.length > 0 ? { divisionId: selectedDivisionIds } : undefined}
                          disabled={!!(isViewMode && !isEditing)}
                          skipStoreUpdate={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => {
                  const zoneIds = field.value?.map((z) => z.zoneId) || [];
                  const selectedChannelIds = form.watch('channel')?.map((c) => c.channelId) || [];
                  return (
                    <FormItem>
                      <FormLabel>Zone</FormLabel>
                      <FormControl>
                        <MasterRecordMultiSelect
                          masterName="zone"
                          value={zoneIds}
                          onChange={(ids) => {
                            const newValue = ids.map((id) => ({ zoneId: id }));
                            field.onChange(newValue);

                            if (ids.length === 0) {
                              form.setValue('subZone', []);
                            }
                          }}
                          placeholder="Select zones"
                          maxToShow={5}
                          filters={selectedChannelIds.length > 0 ? { channelId: selectedChannelIds } : undefined}
                          disabled={!!(isViewMode && !isEditing)}
                          skipStoreUpdate={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="subZone"
                render={({ field }) => {
                  const subZoneIds = field.value?.map((sz) => sz.subZoneId) || [];
                  const selectedZoneIds = form.watch('zone')?.map((z) => z.zoneId) || [];
                  return (
                    <FormItem>
                      <FormLabel>Sub Zone</FormLabel>
                      <FormControl>
                        <MasterRecordMultiSelect
                          masterName="subZone"
                          value={subZoneIds}
                          onChange={(ids) => {
                            const newValue = ids.map((id) => ({ subZoneId: id }));
                            field.onChange(newValue);
                          }}
                          placeholder="Select sub zones"
                          maxToShow={5}
                          filters={selectedZoneIds.length > 0 ? { zoneId: selectedZoneIds } : undefined}
                          disabled={!!(isViewMode && !isEditing)}
                          skipStoreUpdate={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />


            </div>
          </div>

          <FormField
            control={form.control}
            name="warehouse"
            render={({ field }) => {
              const warehouseIds = field.value?.map((w) => w.warehouseId) || [];

              const selectedDivisionIds = form.watch('division')?.map((d) => d.divisionId) || [];
              const selectedChannelIds = form.watch('channel')?.map((c) => c.channelId) || [];
              const selectedZoneIds = form.watch('zone')?.map((z) => z.zoneId) || [];
              const selectedSubZoneIds = form.watch('subZone')?.map((sz) => sz.subZoneId) || [];

              return (
                <FormItem>
                  <FormLabel></FormLabel>
                  <WarehouseMultiSelectSection
                    selectedWarehouseIds={warehouseIds}
                    onChange={(ids) => {
                      const newValue = ids.map((id) => ({ warehouseId: id }));
                      field.onChange(newValue);
                    }}
                    requirePincode={false}
                    hideFilters={true}
                    selectedDivisionIds={selectedDivisionIds}
                    selectedChannelIds={selectedChannelIds}
                    selectedZoneIds={selectedZoneIds}
                    selectedSubZoneIds={selectedSubZoneIds}
                    disabled={!!(isViewMode && !isEditing)}
                  />
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium flex justify-between">
              User PJP Settings
              <Button onClick={handlePJPClear} type="button">
                Clear
              </Button>
            </div>


            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="pjpPlanTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PJP Plan Type</FormLabel>
                    <FormControl>
                      <MasterRecordSelect
                        masterName="pjpPlanType"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select PJP plan type"
                        disabled={!!(isViewMode && !isEditing)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pjpPlanModeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PJP Plan Mode</FormLabel>
                    <FormControl>
                      <MasterRecordSelect
                        masterName="pjpPlanMode"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select PJP plan mode"
                        disabled={!!(isViewMode && !isEditing)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
              PJP Access Mappings
            </div>
            {(() => {
              const isWarehouseSelected = selectedWarehouseIds.length > 0;
              const isDisabled = !isWarehouseSelected || !!(isViewMode && !isEditing);

              return (
                <div className="space-y-4">
                  {!isWarehouseSelected && (
                    <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                      Please select a warehouse first to enable PJP mappings
                    </div>
                  )}
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

                                if (ids.length === 0) {
                                  form.setValue('district', []);
                                  form.setValue('city', []);
                                  form.setValue('beat', []);
                                  setSelectedBeats([]);
                                }
                              }}
                              placeholder={isWarehouseSelected ? "Select states" : "Select warehouse first"}
                              maxToShow={5}
                              filterIds={isWarehouseSelected ? warehouseMappedIds.stateIds : undefined}
                              disabled={isDisabled}
                              enabled={isWarehouseSelected}
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
                      const selectedStateIds = form.watch('state')?.map((s) => s.stateId) || [];

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
                              placeholder={isWarehouseSelected ? "Select districts" : "Select warehouse first"}
                              maxToShow={5}
                              filterIds={isWarehouseSelected ? warehouseMappedIds.districtIds : undefined}
                              filters={selectedStateIds.length > 0 ? { stateId: selectedStateIds } : undefined}
                              disabled={isDisabled || selectedStateIds.length === 0}
                              enabled={isWarehouseSelected && selectedStateIds.length > 0}
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
                      const selectedDistrictIds = form.watch('district')?.map((d) => d.districtId) || [];

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
                              placeholder={isWarehouseSelected ? "Select cities" : "Select warehouse first"}
                              maxToShow={5}
                              filterIds={isWarehouseSelected ? warehouseMappedIds.cityIds : undefined}
                              filters={selectedDistrictIds.length > 0 ? { districtId: selectedDistrictIds } : undefined}
                              disabled={isDisabled || selectedDistrictIds.length === 0}
                              enabled={isWarehouseSelected && selectedDistrictIds.length > 0}
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

                      return (
                        <FormItem>
                          <FormLabel>Beat</FormLabel>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => {
                                if (!(isViewMode && !isEditing) && isWarehouseSelected) {
                                  setIsBeatMultiSelectModalOpen(true);
                                }
                              }}
                              disabled={isDisabled}
                            >
                              <span className="flex items-center gap-1 flex-1 text-left">
                                {selectedBeats.length === 0 ? (
                                  <span className="text-gray-500">
                                    {!isWarehouseSelected ? "Select warehouse first" : "Select beats"}
                                  </span>
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
                              <svg
                                className="h-4 w-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </Button>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              );
            })()}
          </div>
          {userId && (
            <div className="rounded-lg bg-white p-4">
              <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
                Account Information
              </div>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter username"
                            {...field}
                            disabled
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter password"
                            {...field}
                            disabled
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Only show buttons when not in view mode or when editing in view mode */}
          {!(isViewMode && !isEditing) && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href={NavKeys.Users}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="flex items-center gap-2"
                disabled={createUser.isPending || updateUser.isPending}
                onClick={() => { }}
              >
                {isEditMode
                  ? updateUser.isPending
                    ? 'Updating...'
                    : 'Update User'
                  : isViewMode && isEditing
                    ? updateUser.isPending
                      ? 'Updating...'
                      : 'Update User'
                    : createUser.isPending
                      ? 'Creating...'
                      : 'Create User'}
              </Button>
            </div>
          )}
        </form>
      </Form>

      {/* Location Picker Modal */}
      <LocationPickerModal
        open={isLocationModalOpen}
        onOpenChange={setIsLocationModalOpen}
        onLocationSelect={handleLocationSelect}
        initialCoordinates={selectedCoordinates || undefined}
      />

      {/* Reporting Manager Modal */}
      <ReportingManagerModal
        open={isReportingManagerModalOpen}
        selectedManagerId={form.watch('reportingManagerId')}
        onChange={handleReportingManagerSelect}
        onConfirm={handleReportingManagerConfirm}
        onCancel={() => setIsReportingManagerModalOpen(false)}
        initialSelectedOption={selectedReportingManager || undefined}
      />

      {/* Beat Multi-Select Modal */}
      <BeatMultiSelectModal
        open={isBeatMultiSelectModalOpen}
        selectedBeats={selectedBeats}
        onConfirm={handleBeatMultiSelectConfirm}
        onCancel={handleBeatMultiSelectCancel}
        allowedStateIds={form.watch('state')?.map((s) => s.stateId)}
        allowedDistrictIds={form.watch('district')?.map((d) => d.districtId)}
        allowedCityIds={form.watch('city')?.map((c) => c.cityId)}
        warehouseMappedStateIds={warehouseMappedIds.stateIds}
        warehouseMappedDistrictIds={warehouseMappedIds.districtIds}
        warehouseMappedCityIds={warehouseMappedIds.cityIds}
      />
    </section>
  );
};

export default UserCreatePage;
