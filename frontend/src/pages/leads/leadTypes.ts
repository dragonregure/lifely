import type { ServerMultiSelectOption } from "@/components/ui/server-multi-select";
import type { Contact, Listing, LeadDeal, LeadSource, LeadStage, User } from "@/types";

export type ContactOption = ServerMultiSelectOption & {
  contact: Contact;
};

export type ListingOption = ServerMultiSelectOption & {
  listing: Listing;
};

export type AssigneeOption = ServerMultiSelectOption & {
  user: User;
};

export type SourceOption = ServerMultiSelectOption & {
  source: LeadSource;
};

export type LeadDraft = {
  contact: Contact | null;
  listing: Listing | null;
  assignee: User | null;
  stage: LeadStage;
  isActive: boolean;
  nextTask: string;
};

export type LeadFilters = {
  search: string;
  assignees: AssigneeOption[];
  sources: SourceOption[];
};

export type LeadEditPermissions = {
  canEditManualFields: boolean;
  canEditAssignee: boolean;
  canAssignToSelf: boolean;
  canEditStage: boolean;
  canEditStatus: boolean;
  canEditNextTask: boolean;
};

export type LeadCreatePermissions = {
  canChangeAssignee: boolean;
  canAssignToSelf: boolean;
};

export type LeadColumn = {
  stage: LeadStage;
  deals: LeadDeal[];
};
