export type Advertisement = {
  _id: string;
  // Business identifier used by backend routes
  advertisementId: string;
  notes: string;
  budget: number;
  advertisementDate: string; // ISO date
  // Display name from backend (if provided). Kept for rendering purposes.
  advertisementType?: string;
  // Backend identifier used for create/update and lookups
  advertisementTypeId?: string;
  createdAt: string;
  updatedAt: string;
};
