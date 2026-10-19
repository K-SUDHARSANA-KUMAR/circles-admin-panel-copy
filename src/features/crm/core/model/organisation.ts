import type { AdminId, IsoDateTime, OrganisationId } from './common';

export const ORGANISATION_KINDS = ['venue', 'brand', 'fund', 'publication', 'agency', 'other'] as const;
export type OrganisationKind = (typeof ORGANISATION_KINDS)[number];

export const ORGANISATION_KIND_LABELS: Record<OrganisationKind, string> = {
  venue: 'Venue',
  brand: 'Brand',
  fund: 'Fund',
  publication: 'Publication',
  agency: 'Agency',
  other: 'Other',
};

export interface Organisation {
  id: OrganisationId;
  name: string;
  kind: OrganisationKind;
  /** Email domains people at this organisation use, lower-case, e.g. ["birley.com"]. */
  domains: string[];
  website?: string;
  city?: string;
  /** Link to the Venue tracking module, for venues. */
  venueId?: string;
  ownerId?: AdminId;
  tags: string[];
  nextFollowUpAt?: IsoDateTime;
  ownerOnly: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
