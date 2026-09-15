export type ListingDocument = {
  id: string;
  tenantId: string;
  model: string;
  modelId: string;
  type: string;
  subtype: string | null;
  fileName: string | null;
  order: number;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export type ListingUserLink = {
  userId: string;
  isPrimaryOwner: boolean | null;
};

export type Listing = {
  id: string;
  tenantId: string;
  title: string;
  address: string;
  price: string | number;
  status: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: number;
  contactIds?: string[];
  userLinks?: ListingUserLink[];
  documents?: ListingDocument[];
  createdAt: string;
  updatedAt: string;
};
