import type { ContactPayload, ReferenceOption } from "@/services/api";
import type { Contact, User } from "@/types";
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

export function payloadFromDraft(draft: ContactDraft): ContactPayload {
  return {
    ownerId: draft.ownerId || null,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    phone: nullableText(draft.phone),
    ...(draft.statusId ? { statusId: draft.statusId } : {}),
    budget: nullableNumber(draft.budget),
    source: nullableText(draft.source),
    lastContactedAt: nullableDate(draft.lastContactedAt),
  };
}

export function profilePayloadFromDraft(draft: ContactDraft): ContactPayload {
  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    phone: nullableText(draft.phone),
    ...(draft.statusId ? { statusId: draft.statusId } : {}),
    budget: nullableNumber(draft.budget),
    source: nullableText(draft.source),
  };
}

export function blankDraft(ownerId = "", statusId = ""): ContactDraft {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    statusId,
    budget: "",
    source: "Website",
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
    statusId: contact.statusId ?? "",
    budget: String(contact.budget),
    source: contact.source,
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

export function defaultContactStatusId(statusOptions: ReferenceOption[]) {
  return statusOptions.find((status) => status.label === "New")?.value ?? statusOptions[0]?.value ?? "";
}
