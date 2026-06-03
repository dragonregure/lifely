import type { ListingStatus, ListingType } from "@/types";

export const LISTING_STATUS = {
  available: 1,
  reserved: 2,
  underContract: 3,
  sold: 4,
} as const satisfies Record<string, ListingStatus>;

export const LISTING_TYPE = {
  house: 1,
  condo: 2,
  townhome: 3,
  apartment: 4,
  studio: 5,
  villa: 6,
  duplex: 7,
  multiFamily: 8,
  land: 9,
  farm: 10,
  office: 11,
  retail: 12,
  warehouse: 13,
  commercial: 14,
  industrial: 15,
  mixedUse: 16,
} as const satisfies Record<string, ListingType>;

export const LISTING_STATUS_OPTIONS: Array<{ label: string; value: ListingStatus }> = [
  { label: "Available", value: LISTING_STATUS.available },
  { label: "Reserved", value: LISTING_STATUS.reserved },
  { label: "Under Contract", value: LISTING_STATUS.underContract },
  { label: "Sold", value: LISTING_STATUS.sold },
];

export const LISTING_TYPE_OPTIONS: Array<{ label: string; value: ListingType }> = [
  { label: "House", value: LISTING_TYPE.house },
  { label: "Condo", value: LISTING_TYPE.condo },
  { label: "Townhome", value: LISTING_TYPE.townhome },
  { label: "Apartment", value: LISTING_TYPE.apartment },
  { label: "Studio", value: LISTING_TYPE.studio },
  { label: "Villa", value: LISTING_TYPE.villa },
  { label: "Duplex", value: LISTING_TYPE.duplex },
  { label: "Multi-Family", value: LISTING_TYPE.multiFamily },
  { label: "Land", value: LISTING_TYPE.land },
  { label: "Farm", value: LISTING_TYPE.farm },
  { label: "Office", value: LISTING_TYPE.office },
  { label: "Retail", value: LISTING_TYPE.retail },
  { label: "Warehouse", value: LISTING_TYPE.warehouse },
  { label: "Commercial", value: LISTING_TYPE.commercial },
  { label: "Industrial", value: LISTING_TYPE.industrial },
  { label: "Mixed Use", value: LISTING_TYPE.mixedUse },
];

export function listingStatusLabel(status: ListingStatus) {
  return LISTING_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Unknown";
}

export function listingTypeLabel(type: ListingType) {
  return LISTING_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Unknown";
}
