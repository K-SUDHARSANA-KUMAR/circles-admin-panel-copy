export interface EnrichedRecord {
  _id?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  brandCode?: string;
  brandName?: string;
  brandId?: string;
  categoryCode?: string;
  categoryName?: string;
  categoryId?: string;
  subcategoryCode?: string;
  subcategoryName?: string;
  subcategoryId?: string;
  packageCode?: string;
  packageName?: string;
  packageId?: string;
  metadata?: Record<string, string | number | boolean>;
  id: string;
  onEdit: () => void;
  [key: string]:
    | string
    | number
    | boolean
    | (() => void)
    | undefined
    | Record<string, string | number | boolean>;
}


