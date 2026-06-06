import type { ServerMultiSelectOption } from "@/components/ui/server-multi-select";
import type { Contact, ListingAgent, User } from "@/types";

export type ListingOption = {
  label: string;
  value: number;
};

export type ListingDraft = {
  title: string;
  address: string;
  price: string;
  status: string;
  bedrooms: string;
  bathrooms: string;
  type: string;
  contacts: Contact[];
  agents: ListingAgent[];
  primaryOwnerUserId: string | null;
};

export type ContactOption = ServerMultiSelectOption & {
  contact: Contact;
};

export type AgentOption = ServerMultiSelectOption & {
  user: User;
};
