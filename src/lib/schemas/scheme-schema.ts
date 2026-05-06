import { z } from 'zod';

export const schemeFormSchema = z.object({
  schemeCode: z.string().min(1, 'Scheme code is required'),
  schemeName: z.string().min(1, 'Scheme name is required'),
  description: z.string().min(1, 'Description is required'),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().min(1, 'Valid to date is required'),
  maxRewardPerInvoice: z.number().min(1, 'Maximum reward per invoice must be at least 1'),
  isExclusive: z.boolean().default(false),
  applicableTo: z.object({
    warehouseIds: z.array(z.string()).default([]),
    outletIds: z.array(z.string()).default([]),
    productIds: z.array(z.string()).default([]),
    brandIds: z.array(z.string()).default([]),
    categoryIds: z.array(z.string()).default([]),
    subcategoryIds: z.array(z.string()).default([]),
  }),
  conditions: z.array(z.object({
    conditionType: z.enum(['combo', 'assorted', 'invoice', 'lineItem', 'prorated']),
    priority: z.number().min(1, 'Priority must be at least 1'),
    criteria: z.any(),
    reward: z.object({
      type: z.enum(['freeProduct', 'discountPercent', 'discountFixed', 'cashback', 'loyaltyPoints']),
      value: z.number().optional(),
      // Optional discount fields for freeProduct rewards — kept optional for backward compatibility
      discountType: z.enum(['percent', 'fixed']).optional(),
      discountValue: z.number().optional(),
      products: z.array(z.object({
        productId: z.string(),
        quantity: z.number().min(1),
      })).optional(),
      maxRewardAmount: z.number().optional(),
      maxApplications: z.number().optional(),
    }),
  })).min(1, 'At least one condition is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).default('DRAFT'),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  createdBy: z.string().min(1, 'Created by is required'),
});

export type SchemeFormData = z.infer<typeof schemeFormSchema>; 