import { ContactResponseDto } from '../contact/contact.dto.js';
import { ListingResponseDto } from '../listing/listing.dto.js';
import { MemberResponseDto } from '../user/user.dto.js';

export type LeadInclude = 'contact' | 'listing' | 'user';

export type Lead = {
  id: string;
  tenantId: string;
  contactId: string;
  listingId: string;
  userId: string;
  stage: number;
  source: number;
  isActive: boolean;
  nextTask: string | null;
  dueAt: string | null;
  listingValue?: string | number | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadRelations = {
  contact?: ContactResponseDto;
  listing?: ListingResponseDto;
  user?: MemberResponseDto;
};
