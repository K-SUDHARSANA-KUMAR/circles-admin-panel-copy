import { z } from 'zod';

export const outletFormSchema = z.object({
  outletName: z.string().min(1, 'Outlet name is required'),
  businessTypeId:  z.string().min(1, 'Business type is required'),
  shortCode: z.string().optional(),
  email: z.string().optional(),
  ownerName: z.string().min(1, 'Owner name is required'),
  totalPerson: z.preprocess((val) => {
    if (val === '' || val === null || typeof val === 'undefined')
      return undefined;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '') return undefined;
      const num = Number(trimmed);
      return Number.isNaN(num) ? undefined : num;
    }
    return val;
  }, z.number().int().nonnegative().optional()),
  outletStoreSqFtId: z.preprocess(
    (v) =>
      v === null || typeof v === 'undefined' || v === ''
        ? undefined
        : String(v),
    z.string().optional()
  ),
  phoneNumber: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  outletImages: z
    .array(
      z.object({
        s3Filename: z.string().min(1, 'Image filename is required'),
      })
    )
    .optional(),

  pincode: z
    .string()
    .min(6, 'Pincode must be 6 digits')
    .max(6, 'Pincode must be 6 digits')
    .regex(/^\d{6}$/, 'Pincode must contain only digits'),
  area: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  outletAddress: z.object({
    streetAddress: z.string().min(1, 'Street address is required'),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    }),
  }),
  billingAddress: z.object({
    streetAddress: z.string().optional(),
    pincode: z.string().optional(),
    area: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    }).optional(),
  }).optional(),
  bankDetails: z.object({
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    bankName: z.string().optional(),
    branchName: z.string().optional(),
  }).optional(),
  mappings: z.array(
    z.object({ warehouseId: z.string().min(1, 'warehouse is required') })
  ),

  verificationDocuments: z.array(
    z.object({
      documentType: z.string().optional(),
      value: z.string().optional(),
    })
  ).optional(),

  kycDocuments: z.array(
    z.object({
      documentType: z.string().optional(),
      value: z.string().optional(),
    })
  ).optional(),
});

export type OutletFormData = z.infer<typeof outletFormSchema>;
