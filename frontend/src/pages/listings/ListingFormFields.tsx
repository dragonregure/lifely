import type { Dispatch, SetStateAction } from "react";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ServerMultiSelect, type ServerMultiSelectLoadParams, type ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";
import type { AgentOption, ContactOption, ListingDraft, ListingOption } from "./listingTypes";
import { contactName, userName } from "./listingUtils";

type ListingFormFieldsProps = {
  draft: ListingDraft;
  statusOptions: ListingOption[];
  typeOptions: ListingOption[];
  setDraft: Dispatch<SetStateAction<ListingDraft>>;
};

export function ListingFormFields({ draft, statusOptions, typeOptions, setDraft }: ListingFormFieldsProps) {
  const updateDraft = (field: Exclude<keyof ListingDraft, "contacts" | "agents" | "primaryOwnerUserId">, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="listing-title">Title</Label>
        <Input id="listing-title" value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} required maxLength={180} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="listing-address">Address</Label>
        <Input id="listing-address" value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="listing-price">Price</Label>
          <Input id="listing-price" type="number" min="0" step="0.01" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="listing-status">Status</Label>
          <Select id="listing-status" value={draft.status} onChange={(event) => updateDraft("status", event.target.value)} required>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="listing-type">Type</Label>
          <Select id="listing-type" value={draft.type} onChange={(event) => updateDraft("type", event.target.value)} required>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="listing-bedrooms">Bedrooms</Label>
          <Input id="listing-bedrooms" type="number" min="0" max="20" value={draft.bedrooms} onChange={(event) => updateDraft("bedrooms", event.target.value)} required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="listing-bathrooms">Bathrooms</Label>
          <Input id="listing-bathrooms" type="number" min="0" max="20" value={draft.bathrooms} onChange={(event) => updateDraft("bathrooms", event.target.value)} required />
        </div>
      </div>
    </div>
  );
}

type ListingAssignmentFieldsProps = {
  draft: ListingDraft;
  loadAgentOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<AgentOption>>;
  loadContactOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ContactOption>>;
  setDraft: Dispatch<SetStateAction<ListingDraft>>;
};

export function ListingAssignmentFields({ draft, loadAgentOptions, loadContactOptions, setDraft }: ListingAssignmentFieldsProps) {
  const addContacts = (selectedOptions: ContactOption[]) => {
    if (selectedOptions.length === 0) return;

    setDraft((current) => {
      const assignedIds = new Set(current.contacts.map((contact) => contact.id));
      const nextContacts = selectedOptions.map((option) => option.contact).filter((contact) => !assignedIds.has(contact.id));

      if (nextContacts.length === 0) {
        return current;
      }

      return { ...current, contacts: [...current.contacts, ...nextContacts] };
    });
  };

  const removeContact = (contactId: string) => {
    setDraft((current) => ({
      ...current,
      contacts: current.contacts.filter((contact) => contact.id !== contactId),
    }));
  };

  const addAgents = (selectedOptions: AgentOption[]) => {
    if (selectedOptions.length === 0) return;

    setDraft((current) => {
      const assignedIds = new Set(current.agents.map((agent) => agent.id));
      const nextAgents = selectedOptions
        .map((option) => option.user)
        .filter((user) => !assignedIds.has(user.id))
        .map((user) => ({ ...user, isPrimaryOwner: false }));

      if (nextAgents.length === 0) {
        return current;
      }

      return { ...current, agents: [...current.agents, ...nextAgents] };
    });
  };

  const removeAgent = (agentId: string) => {
    setDraft((current) => ({
      ...current,
      agents: current.agents.filter((agent) => agent.id !== agentId),
      primaryOwnerUserId: current.primaryOwnerUserId === agentId ? null : current.primaryOwnerUserId,
    }));
  };

  const setPrimaryOwner = (agentId: string, isChecked: boolean) => {
    setDraft((current) => ({
      ...current,
      primaryOwnerUserId: isChecked ? agentId : null,
    }));
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="listing-contact-assignment">Contacts</Label>
        <ServerMultiSelect<ContactOption>
          id="listing-contact-assignment"
          value={[]}
          onChange={addContacts}
          loadOptions={loadContactOptions}
          placeholder="Add contacts"
          searchPlaceholder="Search contacts..."
          emptyLabel="No contacts found."
        />
      </div>

      <div className="rounded-md border bg-slate-50 p-3">
        {draft.contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts assigned.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {draft.contacts.map((contact) => (
              <li key={contact.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-white px-2 py-1 text-sm font-medium text-slate-900 ring-1 ring-border">
                <span className="truncate">{contactName(contact)}</span>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Unassign ${contactName(contact)}`}
                  title={`Unassign ${contactName(contact)}`}
                  onClick={() => removeContact(contact.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="listing-agent-assignment">Agents</Label>
        <ServerMultiSelect<AgentOption>
          id="listing-agent-assignment"
          value={[]}
          onChange={addAgents}
          loadOptions={loadAgentOptions}
          placeholder="Add agents"
          searchPlaceholder="Search agents..."
          emptyLabel="No agents found."
        />
      </div>

      <div className="rounded-md border bg-slate-50 p-3">
        {draft.agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agents assigned.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {draft.agents.map((agent) => (
              <li key={agent.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-white px-2 py-1 text-sm font-medium text-slate-900 ring-1 ring-border">
                <span className="truncate">{userName(agent)}</span>
                <Checkbox
                  checked={draft.primaryOwnerUserId === agent.id}
                  onChange={(event) => setPrimaryOwner(agent.id, event.target.checked)}
                  title="Set this user as primary owner"
                  aria-label={`Set ${userName(agent)} as primary owner`}
                />
                <button
                  type="button"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Unassign ${userName(agent)}`}
                  title={`Unassign ${userName(agent)}`}
                  onClick={() => removeAgent(agent.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
