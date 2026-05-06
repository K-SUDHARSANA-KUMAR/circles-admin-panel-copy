import { z } from 'zod';

export const warehouseFormSchema = z.object({
  warehouseName: z.string().min(1, 'Warehouse name is required'),
  shortCode: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  channelId: z.string().min(1, 'Channel is required'),
  warehouseTypeId: z.string().min(1, 'Warehouse type is required'),
  divisionId: z.string().min(1, 'Division is required'),
  zoneId: z.string().min(1, 'Zone is required'),
  subZoneId: z.string().min(1, 'Subzone is required'),
  // PJP Access Mappings
  state: z.array(z.object({ stateId: z.string() })).optional(),
  district: z.array(z.object({ districtId: z.string() })).optional(),
  city: z.array(z.object({ cityId: z.string() })).optional(),
  beat: z.array(z.object({ beatId: z.string() })).optional(),
});

export type WarehouseFormData = z.infer<typeof warehouseFormSchema>;

export const pincodeFormSchema = z.object({
  pincode: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
});

export type PincodeFormData = z.infer<typeof pincodeFormSchema>;
