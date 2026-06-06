import type { ServerMultiSelectOption } from "@/components/ui/server-multi-select";
import type { Contact, User } from "@/types";

export type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  budget: string;
  sourceId: string;
  ownerId: string;
  lastContactedAt: string;
};

export type PendingContactAction = {
  type: "deactivate" | "activate" | "delete";
  contact: Contact;
};

export type MemberOption = ServerMultiSelectOption & {
  member: User;
};
