import { formatCurrency } from "@/lib/utils";
import type { PipelineDealPayload } from "@/services/api";
import type { Contact, Listing, PipelineDeal, PipelineSource, User } from "@/types";
import { MANUAL_ENTRY_SOURCE } from "./pipelineConstants";
import type {
  AssigneeOption,
  ContactOption,
  ListingOption,
  PipelineDraft,
  PipelineEditPermissions,
  PipelineFilters,
  SourceOption,
} from "./pipelineTypes";

export const emptyPipelineFilters: PipelineFilters = {
  search: "",
  assignees: [],
  sources: [],
};

export function contactName(contact: Contact) {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

export function contactToOption(contact: Contact): ContactOption {
  return {
    value: contact.id,
    label: contactName(contact),
    description: contact.email,
    contact,
  };
}

export function listingToOption(listing: Listing): ListingOption {
  return {
    value: listing.id,
    label: listing.title,
    description: formatCurrency(listing.price),
    listing,
  };
}

export function userToOption(user: User): AssigneeOption {
  return {
    value: user.id,
    label: user.name,
    description: user.email,
    user,
  };
}

export function sourceToOption(source: PipelineSource): SourceOption {
  return {
    value: source,
    label: source,
    source,
  };
}

export function createPipelineDraft(currentUser: User | null): PipelineDraft {
  return {
    contact: null,
    listing: null,
    assignee: currentUser,
    stage: "New Lead",
    isActive: true,
    nextTask: "",
  };
}

export function draftFromDeal(deal: PipelineDeal, members: User[]): PipelineDraft {
  return {
    contact: deal.contact ?? null,
    listing: deal.listing ?? null,
    assignee: deal.user ?? members.find((member) => member.id === deal.userId) ?? null,
    stage: deal.stage,
    isActive: deal.isActive,
    nextTask: deal.nextTask ?? "",
  };
}

export function changedPipelinePayload(deal: PipelineDeal, draft: PipelineDraft, permissions: PipelineEditPermissions): Partial<PipelineDealPayload> {
  const payload: Partial<PipelineDealPayload> = {};

  if (permissions.canEditManualFields) {
    if (draft.contact?.id && draft.contact.id !== deal.contactId) {
      payload.contactId = draft.contact.id;
    }

    if (draft.listing?.id && draft.listing.id !== deal.listingId) {
      payload.listingId = draft.listing.id;
    }
  }

  if ((permissions.canEditAssignee || permissions.canAssignToSelf) && draft.assignee?.id && draft.assignee.id !== deal.userId) {
    payload.userId = draft.assignee.id;
  }

  if (permissions.canEditProgress) {
    if (draft.stage !== deal.stage) {
      payload.stage = draft.stage;
    }

    if (draft.isActive !== deal.isActive) {
      payload.isActive = draft.isActive;
    }

    const nextTask = draft.nextTask.trim() || null;
    if (nextTask !== (deal.nextTask ?? null)) {
      payload.nextTask = nextTask;
    }
  }

  return payload;
}

export function activeFilterCount(filters: PipelineFilters) {
  return filters.assignees.length + filters.sources.length;
}

export function searchableDealText(deal: PipelineDeal) {
  return [
    deal.contact ? contactName(deal.contact) : "",
    deal.contact?.email ?? "",
    deal.listing?.title ?? "",
    deal.user?.name ?? "",
    deal.user?.email ?? "",
    deal.source,
    deal.stage,
    deal.nextTask ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function dealMatchesFilters(deal: PipelineDeal, filters: PipelineFilters) {
  if (filters.assignees.length > 0 && !filters.assignees.some((assignee) => assignee.value === deal.userId)) {
    return false;
  }

  if (filters.sources.length > 0 && !filters.sources.some((source) => source.value === deal.source)) {
    return false;
  }

  const search = filters.search.trim().toLowerCase();
  if (search && !searchableDealText(deal).includes(search)) {
    return false;
  }

  return true;
}

export function canEditManualPipelineFields(deal: PipelineDeal) {
  return deal.source === MANUAL_ENTRY_SOURCE;
}
