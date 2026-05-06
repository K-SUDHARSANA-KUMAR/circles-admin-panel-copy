export interface MasterCategory {
  id?: string;
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface CreateRecordPayload {
  masterName: string;
  data: Omit<MasterCategory, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateRecordPayload {
  masterName: string;
  recordId: string;
  data: Partial<Omit<MasterCategory, 'id' | 'createdAt' | 'updatedAt'>>;
}

export interface MasterRecord {
  _id?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  // Brand specific fields
  brandCode?: string;
  brandName?: string;
  brandId?: string;
  // Category specific fields
  categoryCode?: string;
  categoryName?: string;
  categoryId?: string;
  // Subcategory specific fields
  subcategoryCode?: string;
  subcategoryName?: string;
  subcategoryId?: string;
  // Package specific fields
  packageCode?: string;
  packageName?: string;
  packageId?: string;
  // Pincode specific fields
  pincode?: number;
  pincodeId?: string;
  cityName?: string;
  districtName?: string;
  stateName?: string;
  // Generic metadata for other master types
  metadata?: Record<string, string | number | boolean>;
  // Index signature for dynamic property access
  [key: string]:
  | string
  | number
  | boolean
  | undefined
  | Record<string, string | number | boolean>;
}

export interface PaginatedResponse<T> {
  totalItems: number;
  totalPages: number;
  skip: number;
  limit: number;
  items: T[];
}

export interface ApiResponse<T> {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: T;
}

export interface CreateRecordPayload {
  masterName: string;
  data: Omit<MasterCategory, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateRecordPayload {
  masterName: string;
  recordId: string;
  data: Partial<Omit<MasterCategory, 'id' | 'createdAt' | 'updatedAt'>>;
}

export type MasterRecordFilters = Record<
  string,
  string | number | boolean | any
>;