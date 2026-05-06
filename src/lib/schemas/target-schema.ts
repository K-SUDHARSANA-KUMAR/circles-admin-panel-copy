import { z } from 'zod';

export const targetFormSchema = z.object({
  targetName: z.string().min(1, 'Target name is required'),
  userId: z.array(z.string()).default([]),
  warehouseId: z.array(z.string()).min(1, 'At least one warehouse is required'),
  productId: z.array(z.string()).default([]),
  brandId: z.array(z.string()).default([]),
  categoryId: z.array(z.string()).default([]),
  subCategoryId: z.array(z.string()).default([]),
  divisionId: z.array(z.string()).default([]),
  channelId: z.array(z.string()).default([]),
  zoneId: z.array(z.string()).default([]),
  subZoneId: z.array(z.string()).default([]),
  target: z.object({
    amount: z.number().min(0, 'Amount must be a positive number'),
    kgs: z.number().min(0, 'KGs must be a positive number'),
  }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

export type TargetFormData = z.infer<typeof targetFormSchema>;

