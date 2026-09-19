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

export type CampaignRecipient = {
  id: string;
  email: string;
  name: string;
};

export type CampaignListing = {
  title: string;
  address: string;
  price: number;
  status: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: number;
};
