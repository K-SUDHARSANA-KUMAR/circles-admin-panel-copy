import { OutletVisitRecord } from '@/components/data-tables/pjp/outlet-visit-columns';

export interface ApplicableToData {
  warehouseIds: string[];
  beatIds: string[];
  userIds: string[];
}

export interface ExtendedOutletVisitRecord extends OutletVisitRecord {
  selectedOutlets?: {
    outletId: string;
    outletName: string;
    location?: {
      type: string;
      coordinates: [number, number];
    };
    warehouseId?: string;
    index?: number;
  }[];
  applicableTo?: ApplicableToData;
  pjpVisitTypeId?: string;
  assignedActivityBeatIds?: string[];
  previousPlan?: {
    outlets?: Array<{
      outletId: string;
      outletName: string;
    }>;
    applicableTo?: ApplicableToData;
  };
}

export interface FormState {
  salesPerson: string;
  pjpType: string;
  selectedWarehouseId: string;
  selectedDivision: string;
  selectedChannel: string;
  selectedZone: string;
  selectedSubZone: string;
  selectedWarehouse: string;
  selectedUser: string;
  editModeUserName: string;
}

export interface PjpPayload {
  userId: string;
  planType: string;
  routePlanMode: string;
  visitPeriod: {
    from: string;
    to: string;
  };
  journeyPlan: {
    visitDate: string;
    userId: string;
    outlets: {
      outletId: string;
      outletName: string;
      location: {
        type: 'Point';
        coordinates: [number, number];
      };
      index: number;
      warehouseId: string;
    }[];
    applicableTo?: ApplicableToData;
    assignedTo?: Array<{
      beatIds: string[];
      pjpVisitTypeIds: Array<{
        pjpVisitTypeId: string;
      }>;
    }>;
  }[];
  warehouseId: string[];
  reason?: string; // Optional reason field for editing approved records
}
