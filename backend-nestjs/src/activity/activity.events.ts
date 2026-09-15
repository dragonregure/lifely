import type { Contact } from '../contact/contact.type.js';
import type { Lead } from '../lead/lead.type.js';
import type { Listing } from '../listing/listing.type.js';
import type { ActivityProperties } from './activity.type.js';

export const ActivityEvents = {
  CONTACT_CREATED: 'activity.contact.created',
  CONTACT_UPDATED: 'activity.contact.updated',
  CONTACT_DELETED: 'activity.contact.deleted',
  LISTING_CREATED: 'activity.listing.created',
  LISTING_UPDATED: 'activity.listing.updated',
  LEAD_CREATED: 'activity.lead.created',
  LEAD_UPDATED: 'activity.lead.updated',
  REPORT_EXPORTED: 'activity.report.exported',
} as const;

export type ContactCreatedActivityEvent = {
  contact: Contact;
};

export type ContactUpdatedActivityEvent = {
  before: Contact;
  after: Contact;
};

export type ContactDeletedActivityEvent = {
  contact: Contact;
};

export type ListingCreatedActivityEvent = {
  listing: Listing;
};

export type ListingUpdatedActivityEvent = {
  before: Listing;
  after: Listing;
};

export type LeadCreatedActivityEvent = {
  lead: Lead;
};

export type LeadUpdatedActivityEvent = {
  before: Lead;
  after: Lead;
};

export type ReportExportedActivityEvent = {
  tenantId: string;
  userId: string | null;
  reportName: string;
  properties: ActivityProperties;
};
