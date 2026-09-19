import type { Contact } from '../contact/contact.type.js';
import type { Listing } from '../listing/listing.type.js';

export type EmailCampaignStatus = 'Queued' | 'Sending' | 'Sent';

export type EmailCampaign = {
  id: string;
  tenantId: string;
  userId: string | null;
  listingId: string | null;
  subject: string;
  body: string;
  contactIds: unknown;
  recipientCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignRecipient = Pick<
  Contact,
  'id' | 'tenantId' | 'firstName' | 'lastName' | 'email'
>;

export type CampaignListing = Pick<
  Listing,
  | 'id'
  | 'tenantId'
  | 'title'
  | 'address'
  | 'price'
  | 'status'
  | 'bedrooms'
  | 'bathrooms'
  | 'propertyType'
>;
