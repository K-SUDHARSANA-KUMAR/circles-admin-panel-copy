import { z } from 'zod';

export const claimFormSchema = z.object({
  claimType: z.string().optional(),
  attachment: z.instanceof(File).optional().or(z.string().optional()),
  claimAmount: z.number().min(0, 'Claim amount must be a positive number'),
  claimDate: z.date({
    required_error: 'Please select a claim date',
  }),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  description: z.string().optional(),
  legitimacyScore: z.number().min(0).max(100).optional(),
  legitimacyReasons: z.array(z.string()).optional(),
});

export type ClaimFormData = z.infer<typeof claimFormSchema>; 