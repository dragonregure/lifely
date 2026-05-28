import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Eye, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { CreateDialog, type CreateDialogTab } from "@/components/dialogs/CreateDialog";
import { DetailDialog, type DetailDialogTab } from "@/components/dialogs/DetailDialog";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { getContacts } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { Contact, ContactStatus } from "@/types";

const statuses: Array<ContactStatus | "All"> = ["All", "New", "Qualified", "Viewing", "Negotiating", "Closed", "Dormant"];
const editableStatuses: ContactStatus[] = ["New", "Qualified", "Viewing", "Negotiating", "Closed", "Dormant"];
const inputClass =
  "h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring";

type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: ContactStatus;
  budget: string;
  source: string;
  ownerId: string;
  lastContactedAt: string;
};

type PendingContactAction = {
  type: "archive" | "activate" | "delete";
  contact: Contact;
};

function contactName(contact: Contact) {
  return `${contact.firstName} ${contact.lastName}`;
}

function toDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function blankDraft(ownerId = ""): ContactDraft {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "New",
    budget: "",
    source: "Website",
    ownerId,
    lastContactedAt: new Date().toISOString().slice(0, 10),
  };
}

function draftFromContact(contact: Contact): ContactDraft {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    status: contact.status,
    budget: String(contact.budget),
    source: contact.source,
    ownerId: contact.ownerId,
    lastContactedAt: toDateInputValue(contact.lastContactedAt),
  };
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ContactStatus | "All">("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ContactDraft>(() => blankDraft());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ContactDraft>(() => blankDraft());
  const [assignmentDraft, setAssignmentDraft] = useState<ContactDraft>(() => blankDraft());
  const [pendingAction, setPendingAction] = useState<PendingContactAction | null>(null);
  const { members } = useAuth();

  useEffect(() => {
    getContacts().then(setContacts);
  }, []);

  useEffect(() => {
    setCreateDraft((draft) => (draft.ownerId ? draft : { ...draft, ownerId: members[0]?.id ?? "" }));
  }, [members]);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  useEffect(() => {
    if (!selectedContact) return;

    const draft = draftFromContact(selectedContact);
    setProfileDraft(draft);
    setAssignmentDraft(draft);
  }, [selectedContact]);

  const filtered = useMemo(() => {
    return contacts.filter((contact) => {
      const haystack = `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.source}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = status === "All" || contact.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [contacts, query, status]);

  const updateDraft = (draft: ContactDraft, patch: Partial<ContactDraft>) => ({ ...draft, ...patch });

  const handleCreateContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const ownerId = createDraft.ownerId || members[0]?.id || "";
    const contact: Contact = {
      id: `local-${Date.now()}`,
      tenantId: members[0]?.tenantId ?? "local",
      firstName: createDraft.firstName,
      lastName: createDraft.lastName,
      email: createDraft.email,
      phone: createDraft.phone,
      status: createDraft.status,
      budget: Number(createDraft.budget) || 0,
      source: createDraft.source,
      ownerId,
      lastContactedAt: toIsoDate(createDraft.lastContactedAt),
    };

    setContacts((current) => [contact, ...current]);
    setCreateDraft(blankDraft(ownerId));
    setCreateOpen(false);
  };

  const openDetails = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setDetailOpen(true);
  };

  const saveProfile = () => {
    if (!selectedContact) return;

    setContacts((current) =>
      current.map((contact) =>
        contact.id === selectedContact.id
          ? {
              ...contact,
              firstName: profileDraft.firstName,
              lastName: profileDraft.lastName,
              email: profileDraft.email,
              phone: profileDraft.phone,
              status: profileDraft.status,
              budget: Number(profileDraft.budget) || 0,
              source: profileDraft.source,
            }
          : contact,
      ),
    );
  };

  const saveAssignment = () => {
    if (!selectedContact) return;

    setContacts((current) =>
      current.map((contact) =>
        contact.id === selectedContact.id
          ? {
              ...contact,
              ownerId: assignmentDraft.ownerId,
              lastContactedAt: toIsoDate(assignmentDraft.lastContactedAt),
            }
          : contact,
      ),
    );
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;

    if (pendingAction.type === "delete") {
      setContacts((current) => current.filter((contact) => contact.id !== pendingAction.contact.id));
      if (selectedContactId === pendingAction.contact.id) {
        setDetailOpen(false);
        setSelectedContactId(null);
      }
    } else {
      setContacts((current) =>
        current.map((contact) =>
          contact.id === pendingAction.contact.id
            ? { ...contact, status: pendingAction.type === "archive" ? "Dormant" : "New" }
            : contact,
        ),
      );
    }

    setPendingAction(null);
  };

  const selectedOwner = selectedContact ? members.find((user) => user.id === selectedContact.ownerId) : undefined;
  const actionLabel =
    pendingAction?.type === "delete" ? "Delete contact" : pendingAction?.type === "archive" ? "Archive contact" : "Activate contact";
  const actionDescription =
    pendingAction?.type === "delete"
      ? `${pendingAction.contact.firstName} ${pendingAction.contact.lastName} will be removed from this local contact list.`
      : pendingAction?.type === "archive"
        ? `${pendingAction.contact.firstName} ${pendingAction.contact.lastName} will move to Dormant status.`
        : `${pendingAction?.contact.firstName} ${pendingAction?.contact.lastName} will move back to New status.`;

  const detailTabs: DetailDialogTab[] | undefined = selectedContact
    ? [
        {
          value: "profile",
          label: "Profile",
          viewContent: (
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Name" value={contactName(selectedContact)} />
              <DetailField label="Status" value={selectedContact.status} />
              <DetailField label="Email" value={selectedContact.email} />
              <DetailField label="Phone" value={selectedContact.phone || "Not provided"} />
              <DetailField label="Budget" value={formatCurrency(selectedContact.budget)} />
              <DetailField label="Source" value={selectedContact.source} />
            </div>
          ),
          editContent: (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="profile-first-name">First name</Label>
                <Input
                  id="profile-first-name"
                  value={profileDraft.firstName}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { firstName: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-last-name">Last name</Label>
                <Input
                  id="profile-last-name"
                  value={profileDraft.lastName}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { lastName: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={profileDraft.email}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { email: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  value={profileDraft.phone}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { phone: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-status">Status</Label>
                <select
                  id="profile-status"
                  className={inputClass}
                  value={profileDraft.status}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { status: event.target.value as ContactStatus }))}
                >
                  {editableStatuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-budget">Budget</Label>
                <Input
                  id="profile-budget"
                  type="number"
                  min="0"
                  value={profileDraft.budget}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { budget: event.target.value }))}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="profile-source">Source</Label>
                <Input
                  id="profile-source"
                  value={profileDraft.source}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { source: event.target.value }))}
                />
              </div>
            </div>
          ),
          onSave: saveProfile,
        },
        {
          value: "assignment",
          label: "Assignment",
          viewContent: (
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Owner" value={selectedOwner?.name ?? "Unassigned"} />
              <DetailField label="Owner role" value={selectedOwner?.role ?? "Not assigned"} />
              <DetailField label="Last contacted" value={new Date(selectedContact.lastContactedAt).toLocaleDateString()} />
              <DetailField label="Owner email" value={selectedOwner?.email ?? "Not assigned"} />
            </div>
          ),
          editContent: (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="assignment-owner">Owner</Label>
                <select
                  id="assignment-owner"
                  className={inputClass}
                  value={assignmentDraft.ownerId}
                  onChange={(event) => setAssignmentDraft(updateDraft(assignmentDraft, { ownerId: event.target.value }))}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignment-contacted">Last contacted</Label>
                <Input
                  id="assignment-contacted"
                  type="date"
                  value={assignmentDraft.lastContactedAt}
                  onChange={(event) => setAssignmentDraft(updateDraft(assignmentDraft, { lastContactedAt: event.target.value }))}
                />
              </div>
            </div>
          ),
          onSave: saveAssignment,
        },
      ]
    : undefined;

  const createTabs: CreateDialogTab[] = [
    {
      value: "profile",
      label: "Profile",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="create-first-name">First name</Label>
            <Input
              id="create-first-name"
              value={createDraft.firstName}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { firstName: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-last-name">Last name</Label>
            <Input
              id="create-last-name"
              value={createDraft.lastName}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { lastName: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              value={createDraft.email}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { email: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-phone">Phone</Label>
            <Input
              id="create-phone"
              value={createDraft.phone}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { phone: event.target.value }))}
            />
          </div>
        </div>
      ),
    },
    {
      value: "ownership",
      label: "Ownership",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="create-status">Status</Label>
            <select
              id="create-status"
              className={inputClass}
              value={createDraft.status}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { status: event.target.value as ContactStatus }))}
            >
              {editableStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-budget">Budget</Label>
            <Input
              id="create-budget"
              type="number"
              min="0"
              value={createDraft.budget}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { budget: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-owner">Owner</Label>
            <select
              id="create-owner"
              className={inputClass}
              value={createDraft.ownerId}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { ownerId: event.target.value }))}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-source">Source</Label>
            <Input
              id="create-source"
              value={createDraft.source}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { source: event.target.value }))}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Contacts"
        description="Track buyer and seller leads with ownership, source, budget, and current status."
        actions={
          <CreateDialog
            title="Add lead"
            description="Capture profile, ownership, and source details for a new lead."
            submitLabel="Save lead"
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={handleCreateContact}
            tabs={createTabs}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Add lead
              </Button>
            }
          />
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search contacts, email, or source" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Tabs value={status} onValueChange={(value) => setStatus(value as ContactStatus | "All")}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            {statuses.map((item) => (
              <TabsTrigger key={item} value={item} className="text-xs">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Last contacted</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contact) => {
              const owner = members.find((user) => user.id === contact.ownerId);
              const isDormant = contact.status === "Dormant";
              return (
                <TableRow key={contact.id}>
                  <TableCell>
                    <p className="font-medium">{contactName(contact)}</p>
                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={contact.status} />
                  </TableCell>
                  <TableCell>{owner?.name ?? "Unassigned"}</TableCell>
                  <TableCell>{formatCurrency(contact.budget)}</TableCell>
                  <TableCell>{contact.source}</TableCell>
                  <TableCell>{new Date(contact.lastContactedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="icon" title="View contact details" aria-label="View contact details" onClick={() => openDetails(contact)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title={isDormant ? "Activate contact" : "Archive contact"}
                        aria-label={isDormant ? "Activate contact" : "Archive contact"}
                        onClick={() => setPendingAction({ type: isDormant ? "activate" : "archive", contact })}
                      >
                        {isDormant ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Delete contact"
                        aria-label="Delete contact"
                        onClick={() => setPendingAction({ type: "delete", contact })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedContact && (
        <DetailDialog
          title={contactName(selectedContact)}
          description="Profile, ownership, and recent contact context."
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setSelectedContactId(null);
          }}
          tabs={detailTabs}
        />
      )}

      {pendingAction && (
        <ConfirmationDialog
          title={actionLabel}
          description={actionDescription}
          confirmLabel={pendingAction.type === "delete" ? "Delete" : pendingAction.type === "archive" ? "Archive" : "Activate"}
          variant={pendingAction.type === "delete" ? "destructive" : "default"}
          open={Boolean(pendingAction)}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
