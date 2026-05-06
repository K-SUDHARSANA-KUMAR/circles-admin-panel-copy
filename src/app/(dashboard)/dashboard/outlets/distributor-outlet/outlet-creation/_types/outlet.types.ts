export type Coordinates = { lat: number; lng: number };

export type DocumentStatus = 'verified' | 'unverified' | 'invalid' | 'Not Set' | undefined;

export type OutletStatus = 'active' | 'suspended' | 'pending' | string | undefined;

export type UploadedImage = { s3Filename: string };

export type VerificationDoc = {
  documentType?: string;
  value?: string;
  verificationStatus?: DocumentStatus;
  verificationReason?: string;
  verifiedBy?: string;
  verifiedAt?: Date | string;
  documentImages?: UploadedImage[];
};

export type WarehouseMapping = { warehouseId: string | number };

export type OutletFormShape = {
  outletName: string;
  businessTypeId: string | number | undefined;
  shortCode?: string;
  email?: string;
  ownerName: string;
  totalPerson?: number | '';
  outletStoreSqFtId?: string | number | undefined;
  phoneNumber: string;
  outletImages: UploadedImage[];
  pincode: string;
  area: string;
  district: string;
  state: string;
  outletAddress: {
    streetAddress: string;
    location: { type: 'Point'; coordinates: [number, number] };
  };
  verificationDocuments: VerificationDoc[];
  kycDocuments: VerificationDoc[];
  mappings: WarehouseMapping[];
};

export type OnLocationSelect = (coordinates: Coordinates) => void;

export type HandleStatusUpdate = (
  index: number,
  status: Exclude<DocumentStatus, 'Not Set' | undefined>
) => Promise<void> | void; 