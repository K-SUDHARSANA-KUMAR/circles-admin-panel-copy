export interface OutletLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Outlet {
  outletId: string;
  outletName: string;
  location: OutletLocation;
  index?: number;
}

export interface JourneyPlanDay {
  day?: number;
  visitDate?: string;
  outlets: Outlet[];
  totalTravelTimeInSecs?: number;
  totalTravelDistInMeters?: number;
}

export interface VisitPeriod {
  from: string;
  to: string;
}

export interface UserInfo {
  _id: string;
  name: string;
  phoneNumber: string;
  email: string;
  employeeCode: string;
  imeiNo: string;
  gradeId: string;
  userType: string;
  reportingTo: string;
  userAddress: {
    location: {
      coordinates: [number, number];
      type: string;
    };
    streetAddress: string;
  };
  status: string;
  doj: string;
  permissionGroup: string[];
  warehouse: Array<{
    warehouseId: string;
  }>;
  userName: string;
  password: string;
  isDeleted: boolean;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  todayPresent?: boolean;
}

export interface RoutePlan {
  _id: string;
  routePlanId: string;
  userId: string;
  userName?: string;
  planType: 'Weekly' | 'Monthly' | 'Daily';
  routePlanMode?: string;
  visitPeriod: VisitPeriod;
  journeyPlan: JourneyPlanDay[];
  warehouseId?: Array<{
    warehouseId: string;
    warehouseName: string;
  }>;
  warehouseName?: string; // Optional: expose warehouse name when backend provides it
  businessTypeId?: string; // Optional business type ID
  status?: string; // Status field for manual PJP (pending, approved, rejected)
  totalTravelKms?: number; // Total travel distance in kilometers
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  userInfo?: UserInfo;
}

export interface RoutePlansResponse {
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
    items: RoutePlan[];
  };
}

export interface OutletVisitOrder {
  _id: string;
  outletId: string;
  outletName: string;
  index: number;
  location: {
    type: string;
    coordinates: [number, number];
  };
  userId: string;
  routePlanId: string;
  warehouseId: string;
  status?: string;
  day: number;
  isDeleted: boolean;
  visitOrderId: string;
  visitOrderStatus: string;
  checkedIn?: string;
  checkedOut?: string;
  visitDate: string;
  travelDurationInSecs: number;
  travelDistInMetres: number;
  adjacentPlan: any[];
  punches: any[];
  createdAt: string;
  updatedAt: string;
  __v?: number;
  todayPresent: boolean;
  userInfo: {
    userId: string;
    name: string;
    employeeCode: string;
    email: string;
    phoneNumber: string;
    todayPresent: boolean;
    checkInPunch: {
      hasCheckIn: boolean;
    };
    checkOutPunch: {
      hasCheckOut: boolean;
    };
  };
  outletInfo?: {
    _id: string;
    outletId: string;
    outletName: string;
    businessTypeId: string;
    phoneNumber: string;
    email: string;
    ownerName: string;
    totalPerson: number;
    outletImages: any[];
    outletStatus: string;
    outletAddress: {
      streetAddress: string;
      location: {
        type: string;
        coordinates: [number, number];
      };
    };
    isDeleted: boolean;
    mappings: Array<{
      warehouseId: string;
    }>;
    pincode: number;
    outletType: string;
    lifeTimeValue: number;
    totalOrders: number;
    averageOrderValue: number;
    outletStoreSqFtId: string;
    isOTPVerified: boolean;
    shortCode: string;
    isShippingAddressSame: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
    beatDetails?: {
      beatId: string;
      beatName: string;
      beatPriority: number;
    };
    businessType?: {
      businessTypeName: string;
    };
  };
}

export interface VisitOrderResponse {
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
    items: OutletVisitOrder[];
  };
}

export interface UsePjpParams {
  userId?: string;
  planType?: string;
  search?: string;
  skip?: number;
  limit?: number;
  warehouseIds?: string[];
  routePlanId?: string;
  parentRoutePlanId?: string;
  status?: string;
  routePlanMode?: string;
  divisionId?: string;
  channelId?: string;
  zoneId?: string;
  subZoneId?: string;
  salesPersonId?: string;
}

// Deviation types
export interface DeviationPeriod {
  from: string;
  to: string;
}

export interface DeviationItem {
  deviationId: string;
  parentRoutePlanId: string;
  userId: string;
  userName: string;
  planType: 'Weekly' | 'Monthly' | 'Daily';
  routePlanMode: 'manual' | 'auto' | string;
  deviationPeriod: DeviationPeriod;
  status: string;
  reason?: string;
  remarks?: string;
  journeyPlan: Array<{
    visitDate: string;
    userId: string;
    outlets: Array<{
      outletId: string;
      outletName: string;
      location: OutletLocation;
      index: number;
      warehouseId: string;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface DeviationsResponse {
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
    items: DeviationItem[];
  };
}