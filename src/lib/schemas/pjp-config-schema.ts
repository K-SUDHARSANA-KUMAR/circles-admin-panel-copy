import { z } from 'zod';

export const pjpConfigFormSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse is required'),
  planFrequency: z.enum(['daily', 'weekly', 'monthly', 'bi-monthly'], {
    required_error: 'Plan frequency is required',
  }),
  includeSundays: z.boolean(),
  totalWorkingHoursInMins: z
    .number()
    .min(1, 'Total working hours must be at least 1 minute')
    .max(1440, 'Total working hours cannot exceed 24 hours (1440 minutes)'),
  breakHoursInMins: z
    .number()
    .min(0, 'Break hours cannot be negative')
    .max(480, 'Break hours cannot exceed 8 hours (480 minutes)'),
  maxTravelDistancePerDay: z
    .number()
    .min(1, 'Maximum travel distance must be at least 1 km')
    .max(1000, 'Maximum travel distance cannot exceed 1000 km'),
  // optimizationRadius: z
  //   .number()
  //   .min(1, 'Optimization radius must be at least 1 km')
  //   .max(500, 'Optimization radius cannot exceed 500 km'),
  outletActivityDurationInMins: z
    .number()
    .min(5, 'Outlet activity duration must be at least 5 minutes')
    .max(480, 'Outlet activity duration cannot exceed 8 hours (480 minutes)'),
  MaxOutletCountPerDay: z
    .number()
    .min(1, 'Maximum outlet count must be at least 1')
    .max(1000, 'Maximum outlet count cannot exceed 1000'),
  workingDays: z
    .number()
    .min(1, 'Working days must be at least 1')
    .max(7, 'Working days cannot exceed 7'),
  roles: z.array(z.string()).optional(),
});

export type PJPConfigFormData = z.infer<typeof pjpConfigFormSchema>; 