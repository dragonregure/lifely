import type { ContactPayload } from "@/services/api";
import type { Contact, User } from "@/types";
import { DEFAULT_CONTACT_SOURCE_ID } from "./contactConstants";
import type { ContactDraft, MemberOption } from "./contactTypes";

export function contactName(contact: Contact) {
  return `${contact.firstName} ${contact.lastName}`;
}

export function toDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

export function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function nullableDate(value: string) {
  return value ? toIsoDate(value) : null;
}

export function nullableNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export function nullableSource(value: string) {
  return value === "" ? null : Number(value);
}

export function payloadFromDraft(draft: ContactDraft): ContactPayload {
  return {
    ownerId: draft.ownerId || null,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    phone: nullableText(draft.phone),
    status: draft.status === "active",
    budget: nullableNumber(draft.budget),
    source: nullableSource(draft.sourceId),
    lastContactedAt: nullableDate(draft.lastContactedAt),
  };
}

export function profilePayloadFromDraft(draft: ContactDraft): ContactPayload {
  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    phone: nullableText(draft.phone),
    status: draft.status === "active",
    budget: nullableNumber(draft.budget),
    source: nullableSource(draft.sourceId),
  };
}

export function blankDraft(ownerId = ""): ContactDraft {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "active",
    budget: "",
    sourceId: DEFAULT_CONTACT_SOURCE_ID,
    ownerId,
    lastContactedAt: new Date().toISOString().slice(0, 10),
  };
}

export function draftFromContact(contact: Contact): ContactDraft {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    status: contact.statusValue ? "active" : "inactive",
    budget: String(contact.budget),
    sourceId: contact.sourceId === null ? "" : String(contact.sourceId),
    ownerId: contact.ownerId,
    lastContactedAt: toDateInputValue(contact.lastContactedAt),
  };
}

export function updateDraft(draft: ContactDraft, patch: Partial<ContactDraft>) {
  return { ...draft, ...patch };
}

export function memberToOption(member: User): MemberOption {
  return {
    value: member.id,
    label: member.name,
    description: member.email,
    member,
  };
}
