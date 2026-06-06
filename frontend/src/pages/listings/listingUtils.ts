import type { SyntheticEvent } from "react";
import propertyPlaceholder from "@/assets/property-default.svg";
import type { ListingPayload } from "@/services/api";
import type { Contact, Listing, User } from "@/types";
import type { AgentOption, ContactOption, ListingDraft, ListingOption } from "./listingTypes";

export function listingImageUrl(listing: Listing) {
  return listing.documents.find((document) => document.type === "mainImage")?.url ?? propertyPlaceholder;
}

export function contactName(contact: Contact) {
  return `${contact.firstName} ${contact.lastName}`;
}

export function userName(user: User) {
  return user.name;
}

export function handleImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.dataset.fallbackApplied !== "true") {
    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = propertyPlaceholder;
  }
}

export function emptyListingDraft(statusOptions: ListingOption[], typeOptions: ListingOption[]): ListingDraft {
  return {
    title: "",
    address: "",
    price: "",
    status: String(statusOptions[0]?.value ?? ""),
    bedrooms: "0",
    bathrooms: "0",
    type: String(typeOptions[0]?.value ?? ""),
    contacts: [],
    agents: [],
    primaryOwnerUserId: null,
  };
}

export function draftFromListing(listing: Listing): ListingDraft {
  return {
    title: listing.title,
    address: listing.address,
    price: String(listing.price),
    status: String(listing.status),
    bedrooms: String(listing.bedrooms),
    bathrooms: String(listing.bathrooms),
    type: String(listing.type),
    contacts: listing.contacts,
    agents: listing.agents,
    primaryOwnerUserId: listing.agents.find((agent) => agent.isPrimaryOwner)?.id ?? null,
  };
}

export function payloadFromDraft(draft: ListingDraft): ListingPayload {
  return {
    title: draft.title.trim(),
    address: draft.address.trim(),
    price: Number(draft.price),
    status: Number(draft.status) as ListingPayload["status"],
    bedrooms: Number(draft.bedrooms),
    bathrooms: Number(draft.bathrooms),
    type: Number(draft.type) as ListingPayload["type"],
    contactIds: draft.contacts.map((contact) => contact.id),
    userIds: draft.agents.map((agent) => agent.id),
    primaryOwnerUserId: draft.primaryOwnerUserId,
  };
}

export function contactToOption(contact: Contact): ContactOption {
  return {
    value: contact.id,
    label: contactName(contact),
    description: contact.email,
    contact,
  };
}

export function userToOption(user: User): AgentOption {
  return {
    value: user.id,
    label: userName(user),
    description: user.email,
    user,
  };
}
