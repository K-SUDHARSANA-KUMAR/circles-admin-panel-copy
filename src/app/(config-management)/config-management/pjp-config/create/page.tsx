'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { Save, Edit, CheckCircle, XCircle } from 'lucide-react';
import { RequirePermission } from '@/components/auth/require-permission';
import { WarehouseDropdown } from '@/components/shared/warehouse-dropdown';
import { MasterRecordMultiSelect } from '@/components/shared/master-record-multi-select';
import { usePjpConfig } from '@/features/config-management/pjp-config/hooks/usePjpConfig';
import PjpConfigInsights from './_components/pjp-config-insights';
import {
  pjpConfigFormSchema,
  type PJPConfigFormData,
} from '@/lib/schemas/pjp-config-schema';
import { type PJPConfig } from '@/features/config-management/pjp-config/api/pjp-config';
import Loading from '@/components/ui/loading';
import GenericError from '@/components/ui/generic-error';
import { usePermissionChecker } from '@/features/auth/hooks/useHasPermission';
import NavKeys from '@/constants/navkeys';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ArrowLeftIcon, Home } from 'lucide-react';
import Link from 'next/link';
import { MENU_RIGHTS, PERMISSIONS } from '@/constants/permissions.constant';

const PJPConfigFormPage = () => {
  return (
    <RequirePermission
      module={PERMISSIONS.PJP_CONFIG}
      action={MENU_RIGHTS.CREATE}
    >
      <PJPConfigFormContent />
    </RequirePermission>
  );
};

const PJPConfigFormContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const editId = searchParams.get('edit');
  const viewId = searchParams.get('view');
  const configId = editId || viewId || '';
  const warehouseIdFromQuery = searchParams.get('warehouseId') || '';
  const mode = editId ? 'edit' : viewId ? 'view' : 'create';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const pjpPermission = usePermissionChecker('pjp-config');
  const hasEditPermission = pjpPermission.has('edit');
  const hasCreatePermission = pjpPermission.has('create');

  const isEditMode = mode === 'edit';
  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  // Function to calculate plan details based on frequency and includeSundays
  const getPlanDetails = (frequency: string, includeSundays: boolean) => {
    const today = new Date();
    const currentDate = today.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    switch (frequency) {
      // case 'daily':
      //   const dailyDays = includeSundays ? 1 : 1; // Daily is always 1 day
      //   const nextDay = new Date(today);
      //   nextDay.setDate(today.getDate() + 1);
      //   const nextDayDate = nextDay.toLocaleDateString('en-GB', { 
      //     day: '2-digit', 
      //     month: '2-digit', 
      //     year: 'numeric' 
      //   });
      //   return {
      //     days: dailyDays,
      //     period: '1 day',
      //     fromDate: currentDate,
      //     toDate: nextDayDate,
      //     description: '1 day (daily plan)'
      //   };
      
      case 'weekly':
        const weeklyDays = includeSundays ? 7 : 6;
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const nextWeekDate = nextWeek.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        return {
          days: weeklyDays,
          period: '7 days',
          fromDate: currentDate,
          toDate: nextWeekDate,
          description: includeSundays ? '7 days (including Sundays)' : '6 days (excluding Sundays)'
        };
      
      case 'monthly':
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const monthlyDays = includeSundays ? daysInMonth : daysInMonth - Math.floor(daysInMonth / 7);
        const nextMonthDate = nextMonth.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        return {
          days: monthlyDays,
          period: `${daysInMonth} days`,
          fromDate: currentDate,
          toDate: nextMonthDate,
          description: includeSundays ? `${daysInMonth} days (including Sundays)` : `${monthlyDays} days (excluding Sundays)`
        };
      
      case 'bi-monthly':
        const nextBiMonth = new Date(today);
        nextBiMonth.setMonth(today.getMonth() + 2);
        const daysInBiMonth = 60; // Approximate 2 months
        const biMonthlyDays = includeSundays ? daysInBiMonth : daysInBiMonth - Math.floor(daysInBiMonth / 7) * 2;
        const nextBiMonthDate = nextBiMonth.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        return {
          days: biMonthlyDays,
          period: '60 days',
          fromDate: currentDate,
          toDate: nextBiMonthDate,
          description: includeSundays ? '60 days (including Sundays)' : `${biMonthlyDays} days (excluding Sundays)`
        };
      
      default:
        return {
          days: 0,
          period: 'N/A',
          fromDate: currentDate,
          toDate: currentDate,
          description: 'Please select a frequency'
        };
    }
  };

  const { createPjpConfig, getPjpConfig, updatePjpConfig, getPjpInsights } =
    usePjpConfig();
  const configQuery =
    configId && (mode === 'edit' || mode === 'view')
      ? getPjpConfig(configId)
      : null;
  const insightsQuery = getPjpInsights(
    configId && (mode === 'view' || mode === 'edit') ? configId : '',
    { enabled: !!(configId && (mode === 'view' || mode === 'edit')) }
  );

  const form = useForm<PJPConfigFormData>({
    resolver: zodResolver(pjpConfigFormSchema),
    defaultValues: {
      warehouseId: '',
      planFrequency: 'weekly',
      includeSundays: false,
      totalWorkingHoursInMins: 480, // 8 hours
      breakHoursInMins: 60, // 1 hour
      maxTravelDistancePerDay: 150,
      // optimizationRadius: 50,
      outletActivityDurationInMins: 45,
      MaxOutletCountPerDay: 8,
      workingDays: 5,
      roles: [],
    },
  });

  // Populate form when data is loaded (for edit/view modes)
  useEffect(() => {
    if (configQuery?.data?.data && (mode === 'edit' || mode === 'view')) {
      const config = configQuery.data.data;
      form.reset({
        warehouseId: config.warehouseId,
        planFrequency: config.planFrequency,
        includeSundays: config.includeSundays,
        totalWorkingHoursInMins: config.totalWorkingHoursInMins,
        breakHoursInMins: config.breakHoursInMins,
        maxTravelDistancePerDay: config.maxTravelDistancePerDay,
        // optimizationRadius: config.optimizationRadius,
        outletActivityDurationInMins: config.outletActivityDurationInMins,
        MaxOutletCountPerDay: config.MaxOutletCountPerDay,
        workingDays: config.workingDays,
        roles: config.roles || [],
      });
      // Set warehouseId manually with setTimeout for edit mode
      if (mode === 'edit') {
        setTimeout(() => {
          form.setValue('warehouseId', config.warehouseId || '', {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }, 100);
      }
    }
  }, [configQuery?.data, form, mode, configId]);

  const onSubmit = async (data: PJPConfigFormData) => {
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await createPjpConfig.mutateAsync(data);
        toast.success('PJP configuration created successfully');
        router.push(NavKeys.PjpConfig);
      } else if (mode === 'edit' || (mode === 'view' && isEditing)) {
        await updatePjpConfig.mutateAsync({ configId, data });
        toast.success('PJP configuration updated successfully');
        
        // Invalidate insights query to refetch with updated data
        queryClient.invalidateQueries({ 
          queryKey: ['pjp-config-insights', configId] 
        });
        
        if (mode === 'view') {
          setIsEditing(false);
        }
        // Stay on the same page for edit mode - no redirect
      }
    } catch (error: any) {
      console.error(
        `Error ${mode === 'create' ? 'creating' : 'updating'} PJP config:`,
        error
      );
      toast.error(
        error?.response?.data?.message ||
          `Failed to ${mode === 'create' ? 'create' : 'update'} PJP configuration`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original data
    if (configQuery?.data?.data) {
      const config = configQuery.data.data;
      form.reset({
        warehouseId: config.warehouseId,
        planFrequency: config.planFrequency,
        includeSundays: config.includeSundays,
        totalWorkingHoursInMins: config.totalWorkingHoursInMins,
        breakHoursInMins: config.breakHoursInMins,
        maxTravelDistancePerDay: config.maxTravelDistancePerDay,
        // optimizationRadius: config.optimizationRadius,
        outletActivityDurationInMins: config.outletActivityDurationInMins,
        MaxOutletCountPerDay: config.MaxOutletCountPerDay,
        workingDays: config.workingDays,
        roles: config.roles || [],
      });
    }
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      return mode === 'create' ? 'Creating...' : 'Updating...';
    }
    return mode === 'create' ? 'Create Configuration' : 'Update Configuration';
  };

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Loading state
  if (configQuery?.isLoading) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-card p-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={NavKeys.PjpConfig}
                  className="flex items-center gap-1"
                >
                  <Home className="h-3 w-3" /> PJP Configuration
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {isEditMode
                    ? 'Edit Configuration'
                    : isViewMode
                      ? 'View Configuration'
                      : 'Create Configuration'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="w-full rounded-lg bg-card p-6">
          <div className="flex h-64 items-center justify-center">
            <Loading text="Loading configuration..." />
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (configQuery?.error) {
    return (
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 rounded-lg bg-card p-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={NavKeys.PjpConfig}
                  className="flex items-center gap-1"
                >
                  <Home className="h-3 w-3" /> PJP Configuration
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {isEditMode
                    ? 'Edit Configuration'
                    : isViewMode
                      ? 'View Configuration'
                      : 'Create Configuration'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="w-full rounded-lg bg-card p-6">
          <div className="flex h-64 items-center justify-center">
            <GenericError text="Error loading configuration. Please try again." />
          </div>
        </div>
      </section>
    );
  }

  const config = configQuery?.data?.data;
  const insights = insightsQuery?.data?.data;

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-3 rounded-lg bg-card p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href={NavKeys.PjpConfig}
                className="flex items-center gap-1"
              >
                <Home className="h-3 w-3" /> PJP Configuration
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {isEditMode
                  ? 'Edit Configuration'
                  : isViewMode
                    ? 'View Configuration'
                    : 'Create Configuration'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={NavKeys.PjpConfig}
              className="hover:bg-primary/30 rounded-lg bg-neutral-200 p-2 text-neutral-500"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">
                {isEditMode
                  ? 'Edit Configuration'
                  : isViewMode
                    ? 'View Configuration'
                    : 'Create New Configuration'}
              </h1>
              <p className="text-sm text-neutral-500">
                {isEditMode
                  ? 'Update configuration information'
                  : isViewMode
                    ? 'View configuration information'
                    : 'Provide information to create a PJP configuration'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isViewMode && !isEditing && hasEditPermission && (
              <Button onClick={handleEdit} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Configuration
              </Button>
            )}
            {isViewMode && isEditing && (
              <div className="flex gap-2">
                <Button onClick={handleCancelEdit} variant="outline">
                  Cancel
                </Button>
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full rounded-lg bg-card p-6">
        {/* Form for Create/Edit/View modes */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Warehouse Selection */}
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Warehouse</FormLabel>
                    <FormControl>
                      {mode === 'view' && !isEditing && (config as any)?.warehouseName ? (
                        <Input
                          value={(config as any)?.warehouseName || ''}
                          disabled={true}
                          className="w-full"
                        />
                      ) : (
                        <WarehouseDropdown
                          className="w-full"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select warehouse"
                          disabled={mode === 'view' && !isEditing}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Plan Frequency */}
              <FormField
                control={form.control}
                name="planFrequency"
                render={({ field }) => {
                  const planDetails = getPlanDetails(field.value, form.watch('includeSundays'));
                  
                  return (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel isRequired>Plan Frequency</FormLabel>
                        {field.value && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="cursor-help text-xs">
                                  Details
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1 text-xs">
                                  <div className="font-semibold">Plan Details:</div>
                                  <div>• {planDetails.description}</div>
                                  <div>• Period: {planDetails.period}</div>
                                  <div>• From: {planDetails.fromDate}</div>
                                  <div>• To: {planDetails.toDate}</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={mode === 'view' && !isEditing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* <SelectItem value="daily">Daily</SelectItem> */}
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Include Sundays */}
              <FormField
                control={form.control}
                name="includeSundays"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={mode === 'view' && !isEditing}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Include Sundays</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* Working Days */}
              <FormField
                control={form.control}
                name="workingDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Working Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        placeholder="Enter working days"
                        disabled={mode === 'view' && !isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Total Working Hours */}
              <FormField
                control={form.control}
                name="totalWorkingHoursInMins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Total Working Hours (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="1440"
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        placeholder="Enter total working hours in minutes"
                        disabled={mode === 'view' && !isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Break Hours */}
              <FormField
                control={form.control}
                name="breakHoursInMins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Break Hours (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="480"
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        placeholder="Enter break hours in minutes"
                        disabled={mode === 'view' && !isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Max Travel Distance */}
              <FormField
                control={form.control}
                name="maxTravelDistancePerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Max Travel Distance Per Day (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        placeholder="Enter max travel distance"
                        disabled={mode === 'view' && !isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Optimization Radius - Commented out */}
              {/* <FormField
                control={form.control}
                name="optimizationRadius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Optimization Radius (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="500"
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        placeholder="Enter optimization radius"
                        disabled={mode === 'view' && !isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}

              {/* Outlet Activity Duration */}
              <FormField
                control={form.control}
                name="outletActivityDurationInMins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Outlet Activity Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="5"
                        max="480"
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        placeholder="Enter outlet activity duration"
                        disabled={mode === 'view' && !isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Max Outlet Count Per Day */}
              <FormField
                control={form.control}
                name="MaxOutletCountPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Max Outlet Count Per Day</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                        placeholder="Enter max outlet count"
                        disabled={mode === 'view' && !isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Roles */}
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles</FormLabel>
                    <FormControl>
                      <MasterRecordMultiSelect
                        masterName="role"
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder="Search and select roles"
                        className="w-full"
                        maxToShow={3}
                        hideSelectedOptions={true}
                        disabled={mode === 'view' && !isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions - Only show when not in view mode or when editing in view mode */}
            {!(mode === 'view' && !isEditing) && (
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loading className="mr-2 h-4 w-4" />
                      {getSubmitButtonText()}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {getSubmitButtonText()}
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>



      {(isViewMode || isEditMode) && (
        <div className="w-full rounded-lg bg-card p-6">
          <div className="bg-background mb-4 rounded-lg p-2 text-lg font-medium">
            PJP Configuration Insights
          </div>
          <PjpConfigInsights
            isLoading={!insightsQuery || insightsQuery.isLoading}
            error={insightsQuery?.error}
            data={insights}
          />
        </div>
      )}
    </section>
  );
};

export default PJPConfigFormPage;
