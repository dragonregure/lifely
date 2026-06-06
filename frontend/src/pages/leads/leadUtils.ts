import { formatCurrency } from "@/lib/utils";
import { LISTING_STATUS } from "@/lib/listingOptions";
import type { LeadDealPayload } from "@/services/api";
import type { Contact, Listing, LeadDeal, LeadSource, LeadStage, User } from "@/types";
import { CLOSED_LEAD_STAGES, MANUAL_ENTRY_SOURCE } from "./leadConstants";
import type {
  AssigneeOption,
  ContactOption,
  ListingOption,
  LeadDraft,
  LeadEditPermissions,
  LeadFilters,
  SourceOption,
} from "./leadTypes";

export const emptyLeadFilters: LeadFilters = {
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

export function sourceToOption(source: LeadSource): SourceOption {
  return {
    value: source,
    label: source,
    source,
  };
}

export function createLeadDraft(currentUser: User | null): LeadDraft {
  return {
    contact: null,
    listing: null,
    assignee: currentUser,
    stage: "New Lead",
    isActive: true,
    nextTask: "",
  };
}

export function draftFromDeal(deal: LeadDeal, members: User[]): LeadDraft {
  return {
    contact: deal.contact ?? null,
    listing: deal.listing ?? null,
    assignee: deal.user ?? members.find((member) => member.id === deal.userId) ?? null,
    stage: deal.stage,
    isActive: deal.isActive,
    nextTask: deal.nextTask ?? "",
  };
}

export function changedLeadPayload(deal: LeadDeal, draft: LeadDraft, permissions: LeadEditPermissions): Partial<LeadDealPayload> {
  const payload: Partial<LeadDealPayload> = {};

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

  if (permissions.canEditStage) {
    if (draft.stage !== deal.stage) {
      payload.stage = draft.stage;
    }
  }

  if (permissions.canEditStatus) {
    if (draft.isActive !== deal.isActive) {
      payload.isActive = draft.isActive;
    }
  }

  if (permissions.canEditNextTask) {
    const nextTask = draft.nextTask.trim() || null;
    if (nextTask !== (deal.nextTask ?? null)) {
      payload.nextTask = nextTask;
    }
  }

  return payload;
}

export function activeFilterCount(filters: LeadFilters) {
  return filters.assignees.length + filters.sources.length;
}

export function searchableDealText(deal: LeadDeal) {
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

export function dealMatchesFilters(deal: LeadDeal, filters: LeadFilters) {
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

export function canEditManualLeadFields(deal: LeadDeal) {
  return deal.source === MANUAL_ENTRY_SOURCE;
}

export function isClosedLeadStage(stage: LeadStage) {
  return CLOSED_LEAD_STAGES.some((closedStage) => closedStage === stage);
}

export function leadDealProblems(deal: LeadDeal) {
  if (deal.stage === "Closed Won") {
    return [];
  }

  return [
    deal.listing?.status === LISTING_STATUS.sold ? "Listing is sold" : null,
    deal.contact && !deal.contact.statusValue ? "Contact is inactive" : null,
  ].filter((problem): problem is string => Boolean(problem));
}

export function hasLeadDealProblem(deal: LeadDeal) {
  return leadDealProblems(deal).length > 0;
}

export function leadProblemLabel(deal: LeadDeal) {
  const problems = leadDealProblems(deal);

  return problems.length > 0 ? problems.join("; ") : "lead card has a problem";
}
