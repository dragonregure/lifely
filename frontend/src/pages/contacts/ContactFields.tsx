import type { Dispatch, SetStateAction } from "react";
import { ServerMultiSelect, type ServerMultiSelectLoadParams, type ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { Contact, User } from "@/types";
import { CONTACT_SOURCE_OPTIONS, CONTACT_STATUS_OPTIONS } from "./contactConstants";
import type { ContactDraft, MemberOption } from "./contactTypes";
import { updateDraft } from "./contactUtils";

export function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export function ReadOnlyFormField({ id, label, value, isLoading = false }: { id: string; label: string; value: string; isLoading?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} readOnly value={isLoading ? "Loading..." : value} className="bg-slate-50 text-slate-900" />
    </div>
  );
}

export function ContactProfileView({ contact }: { contact: Contact }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DetailField label="First name" value={contact.firstName} />
      <DetailField label="Last name" value={contact.lastName} />
      <DetailField label="Email" value={contact.email} />
      <DetailField label="Phone" value={contact.phone || "Not provided"} />
      <DetailField label="Status" value={contact.status} />
      <DetailField label="Budget" value={formatCurrency(contact.budget)} />
      <DetailField label="Source" value={contact.source} />
    </div>
  );
}

type ContactProfileFieldsProps = {
  fieldPrefix: string;
  draft: ContactDraft;
  setDraft: Dispatch<SetStateAction<ContactDraft>>;
};

export function ContactProfileFields({ fieldPrefix, draft, setDraft }: ContactProfileFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`${fieldPrefix}-first-name`}>First name</Label>
        <Input id={`${fieldPrefix}-first-name`} required value={draft.firstName} onChange={(event) => setDraft(updateDraft(draft, { firstName: event.target.value }))} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${fieldPrefix}-last-name`}>Last name</Label>
        <Input id={`${fieldPrefix}-last-name`} required value={draft.lastName} onChange={(event) => setDraft(updateDraft(draft, { lastName: event.target.value }))} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${fieldPrefix}-email`}>Email</Label>
        <Input id={`${fieldPrefix}-email`} type="email" required value={draft.email} onChange={(event) => setDraft(updateDraft(draft, { email: event.target.value }))} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${fieldPrefix}-phone`}>Phone</Label>
        <Input id={`${fieldPrefix}-phone`} value={draft.phone} onChange={(event) => setDraft(updateDraft(draft, { phone: event.target.value }))} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${fieldPrefix}-status`}>Status</Label>
        <Select id={`${fieldPrefix}-status`} value={draft.status} onChange={(event) => setDraft(updateDraft(draft, { status: event.target.value as ContactDraft["status"] }))}>
          {CONTACT_STATUS_OPTIONS.filter((option) => option.value !== "all").map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${fieldPrefix}-budget`}>Budget</Label>
        <Input id={`${fieldPrefix}-budget`} type="number" min="0" value={draft.budget} onChange={(event) => setDraft(updateDraft(draft, { budget: event.target.value }))} />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor={`${fieldPrefix}-source`}>Source</Label>
        <Select id={`${fieldPrefix}-source`} value={draft.sourceId} onChange={(event) => setDraft(updateDraft(draft, { sourceId: event.target.value }))}>
          {CONTACT_SOURCE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function ContactAssignmentView({ contact, owner }: { contact: Contact; owner?: User }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DetailField label="Owner" value={owner?.name ?? "Unassigned"} />
      <DetailField label="Last contacted" value={new Date(contact.lastContactedAt).toLocaleDateString()} />
      <DetailField label="Owner role" value={owner?.role ?? "Not assigned"} />
      <DetailField label="Owner email" value={owner?.email ?? "Not assigned"} />
    </div>
  );
}

type ContactAssignmentFieldsProps = {
  fieldPrefix: string;
  draft: ContactDraft;
  ownerDetails: User | null;
  ownerValue: MemberOption[];
  loadMemberOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<MemberOption>>;
  onOwnerChange: (selectedOptions: MemberOption[]) => void;
  setDraft: Dispatch<SetStateAction<ContactDraft>>;
};

export function ContactAssignmentFields({
  fieldPrefix,
  draft,
  ownerDetails,
  ownerValue,
  loadMemberOptions,
  onOwnerChange,
  setDraft,
}: ContactAssignmentFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`${fieldPrefix}-owner`}>Owner</Label>
        <ServerMultiSelect<MemberOption>
          id={`${fieldPrefix}-owner`}
          value={ownerValue}
          onChange={onOwnerChange}
          loadOptions={loadMemberOptions}
          maxSelected={1}
          placeholder="Choose owner"
          searchPlaceholder="Search members..."
          emptyLabel="No members found."
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${fieldPrefix}-contacted`}>Last contacted</Label>
        <Input id={`${fieldPrefix}-contacted`} type="date" value={draft.lastContactedAt} onChange={(event) => setDraft(updateDraft(draft, { lastContactedAt: event.target.value }))} />
      </div>
      <ReadOnlyFormField id={`${fieldPrefix}-owner-role`} label="Owner role" value={ownerDetails?.role ?? "Not assigned"} />
      <ReadOnlyFormField id={`${fieldPrefix}-owner-email`} label="Owner email" value={ownerDetails?.email ?? "Not assigned"} />
    </div>
  );
}
