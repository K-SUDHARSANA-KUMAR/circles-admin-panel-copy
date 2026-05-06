import { z } from 'zod';

export const productFormSchema = z.object({
  skuCode: z.string().min(1, 'SKU code is required'),
  productName: z.string().min(1, 'Product name is required'),
  productImages: z.array(
    z.object({
      productS3Filename: z.string().min(1, 'Product S3 filename is required'),
    })
  ).optional(),
  mrp: z.number().min(0, 'MRP must be a positive number'),
  minimumPrice: z.number().min(0, 'Minimum price must be a positive number'),
  gstPercentage: z.number().min(0, 'GST percentage must be a positive number'),
  hsnCode: z.string().min(1, 'HSN code is required'),
  brand: z.string().min(1, 'Brand is required'),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().optional(),
  capacity: z.number().min(0, 'Capacity must be a positive number'),
  baseUom: z.string().min(1, 'Base UOM is required'),
  unitPerCase: z.array(
    z.object({
      numerator: z.number().min(1, 'Numerator must be at least 1'),
      buom: z.string().min(1, 'Base UOM is required'),
      denominator: z.number().min(1, 'Denominator must be at least 1'),
      auom: z.string().min(1, 'Alternative UOM is required'),
    })
  ).optional(),
  warehouse: z
    .array(
      z.object({
        warehouseId: z.string().min(1, 'Warehouse is required'),
      })
    )
    .optional(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;
