export interface OutletAddress {
  location: {
    coordinates: [number, number];
    type: 'Point';
  };
  streetAddress: string;
}

export interface VerificationDocument {
  documentType: string;
  value: string;
  verificationStatus: 'verified' | 'unverified' | 'invalid';
}

export interface WarehouseId {
  warehouseId: string;
}

export interface BeatDetails {
  beatId: string;
  beatPriority: number;
  beatName: string;
}

export interface Outlet {
  _id: string;
  outletId: string;
  outletName: string;
  outletCode?: string;
  shortCode?: string;
  channelId?: string;
  businessTypeId?: string;
  businesstypeId?: string;
  mappings?: any[];
  phoneNumber: string;
  outletImageUrl: string | null;
  outletStatus: 'active' | 'inactive' | 'pending' | 'suspended';
  visitOrderStatus?: 'pending' | 'completed' | 'in-progress' | 'cancelled';
  outletAddress: OutletAddress;
  isDeleted: boolean;
  warehouseId?: string;
  warehouseIds?: WarehouseId[];
  pincode?: number;
  verificationDocuments: VerificationDocument[];
  createdAt: string;
  updatedAt: string;
  outletStoreSqFtId: string;
  paymentModeId?: string;
  paymentMode?: { paymentModeName?: string; paymentModeId?: string };
  area: string;
  district: string;
  state: string;
  ownerName: string;
  email?: string;
  totalPerson?: number;
  outletTypeId?: string;
  outletTypeName?: string;
  beatId?: string;
  beatName?: string;
  beatDetails?: BeatDetails;
  isGstOutlet?: boolean;
}

export interface OutletsResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  data: {
    totalItems: number;
    totalPages: number;
    skip: number;
    limit: number;
    items: Outlet[];
    metrics?: {
      active?: number;
      pending?: number;
      suspended?: number;
      all?: number;
    };
  };
}

export interface UseOutletsParams {
  warehouseId?: string;
  outletTypeId?: string;
  businessTypeId?: string;
  status?: string;
  outletStatus?: string;
  search?: string;
  skip?: number;
  limit?: number;
  enabled?: boolean;
  nonPaginated?: boolean;
  divisionId?: string;
  channelId?: string;
  zoneId?: string;
  subZoneId?: string;
  userId?: string;
  outletType?: string;
  beatId?: string;
  isBeat?: boolean;
  showMetrics?: boolean;
  isGstOutlet?: boolean;
}