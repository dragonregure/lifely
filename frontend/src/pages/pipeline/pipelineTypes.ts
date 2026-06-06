import type { ServerMultiSelectOption } from "@/components/ui/server-multi-select";
import type { Contact, Listing, PipelineDeal, PipelineSource, PipelineStage, User } from "@/types";

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
  source: PipelineSource;
};

export type PipelineDraft = {
  contact: Contact | null;
  listing: Listing | null;
  assignee: User | null;
  stage: PipelineStage;
  isActive: boolean;
  nextTask: string;
};

export type PipelineFilters = {
  search: string;
  assignees: AssigneeOption[];
  sources: SourceOption[];
};

export type PipelineEditPermissions = {
  canEditManualFields: boolean;
  canEditAssignee: boolean;
  canAssignToSelf: boolean;
  canEditProgress: boolean;
};

export type PipelineCreatePermissions = {
  canChangeAssignee: boolean;
  canAssignToSelf: boolean;
};

export type PipelineColumn = {
  stage: PipelineStage;
  deals: PipelineDeal[];
};
