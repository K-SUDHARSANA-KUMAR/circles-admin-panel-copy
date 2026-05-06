export enum OutletStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export const OUTLET_STATUS_OPTIONS = Object.entries(OutletStatusEnum).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
}));

export enum DocumentVerificationStatusEnum {
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified',
  INVALID = 'invalid',
}

export enum VerificationDocumentTypeEnum {
  FSSAI = 'FSSAI',
  GST = 'GST',
  PAN = 'PAN',
  AADHAR = 'AADHAR',
}
