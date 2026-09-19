export const EMAILS_QUEUE = 'emails';

export const SEND_BULK_EMAIL_CAMPAIGN_JOB = 'send-bulk-email-campaign';
export const SEND_CAMPAIGN_EMAIL_TO_CONTACT_JOB =
  'send-campaign-email-to-contact';

export const EMAIL_LIMIT_TENANT_HEADER = 'X-Lifely-Tenant-Id';
export const EMAIL_LIMIT_RESERVED_HEADER = 'X-Lifely-Email-Limit-Reserved';

export const ListingStatuses = {
  AVAILABLE: 1,
  RESERVED: 2,
  UNDER_CONTRACT: 3,
  SOLD: 4,
} as const;

export const ListingTypes = {
  HOUSE: 1,
  CONDO: 2,
  TOWNHOME: 3,
  APARTMENT: 4,
  STUDIO: 5,
  VILLA: 6,
  DUPLEX: 7,
  MULTI_FAMILY: 8,
  LAND: 9,
  FARM: 10,
  OFFICE: 11,
  RETAIL: 12,
  WAREHOUSE: 13,
  COMMERCIAL: 14,
  INDUSTRIAL: 15,
  MIXED_USE: 16,
} as const;

export const LISTING_STATUS_LABELS = {
  [ListingStatuses.AVAILABLE]: 'Available',
  [ListingStatuses.RESERVED]: 'Reserved',
  [ListingStatuses.UNDER_CONTRACT]: 'Under Contract',
  [ListingStatuses.SOLD]: 'Sold',
} as const;

export const LISTING_TYPE_LABELS = {
  [ListingTypes.HOUSE]: 'House',
  [ListingTypes.CONDO]: 'Condo',
  [ListingTypes.TOWNHOME]: 'Townhome',
  [ListingTypes.APARTMENT]: 'Apartment',
  [ListingTypes.STUDIO]: 'Studio',
  [ListingTypes.VILLA]: 'Villa',
  [ListingTypes.DUPLEX]: 'Duplex',
  [ListingTypes.MULTI_FAMILY]: 'Multi-Family',
  [ListingTypes.LAND]: 'Land',
  [ListingTypes.FARM]: 'Farm',
  [ListingTypes.OFFICE]: 'Office',
  [ListingTypes.RETAIL]: 'Retail',
  [ListingTypes.WAREHOUSE]: 'Warehouse',
  [ListingTypes.COMMERCIAL]: 'Commercial',
  [ListingTypes.INDUSTRIAL]: 'Industrial',
  [ListingTypes.MIXED_USE]: 'Mixed Use',
} as const;
