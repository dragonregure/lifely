import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Eye, Plus, RotateCcw, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableFilter, type DataTableQueryContext, type DataTableQueryState } from "@/components/data-table";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { CreateDialog, type CreateDialogTab } from "@/components/dialogs/CreateDialog";
import { DetailDialog, type DetailDialogTab } from "@/components/dialogs/DetailDialog";
import { LoadingInline } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ServerMultiSelect,
  type ServerMultiSelectLoadParams,
  type ServerMultiSelectLoadResult,
  type ServerMultiSelectOption,
} from "@/components/ui/server-multi-select";
import { useAuth } from "@/context/AuthContext";
import {
  createContact,
  deleteContact,
  getContactStatusOptions,
  getContactsPage,
  getMembersPage,
  updateContact,
  type ContactPayload,
  type ReferenceOption,
} from "@/services/api";
import { isAbortError } from "@/services/httpClient";
import { formatCurrency } from "@/lib/utils";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import type { Contact, User } from "@/types";

const inputClass =
  "h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring";

type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  statusId: string;
  budget: string;
  source: string;
  ownerId: string;
  lastContactedAt: string;
};

type PendingContactAction = {
  type: "archive" | "activate" | "delete";
  contact: Contact;
};

type MemberOption = ServerMultiSelectOption & {
  member: User;
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

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function nullableDate(value: string) {
  return value ? toIsoDate(value) : null;
}

function nullableNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

function payloadFromDraft(draft: ContactDraft): ContactPayload {
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

function profilePayloadFromDraft(draft: ContactDraft): ContactPayload {
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

function blankDraft(ownerId = "", statusId = ""): ContactDraft {
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

function draftFromContact(contact: Contact): ContactDraft {
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

function updateDraft(draft: ContactDraft, patch: Partial<ContactDraft>) {
  return { ...draft, ...patch };
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ReadOnlyFormField({ id, label, value, isLoading = false }: { id: string; label: string; value: string; isLoading?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} readOnly value={isLoading ? "Loading..." : value} className="bg-slate-50 text-slate-900" />
    </div>
  );
}

function memberToOption(member: User): MemberOption {
  return {
    value: member.id,
    label: member.name,
    description: member.email,
    member,
  };
}

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ContactDraft>(() => blankDraft());
  const [createOwnerDetails, setCreateOwnerDetails] = useState<User | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ContactDraft>(() => blankDraft());
  const [assignmentDraft, setAssignmentDraft] = useState<ContactDraft>(() => blankDraft());
  const [assignmentOwnerDetails, setAssignmentOwnerDetails] = useState<User | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingContactAction | null>(null);
  const [statusOptions, setStatusOptions] = useState<ReferenceOption[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [contactsRefreshKey, setContactsRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const { members } = useAuth();
  const { can } = useAuthorization();
  const canUpdateContacts = can(PERMISSIONS.contacts.update);
  const canDeleteContacts = can(PERMISSIONS.contacts.delete);
  const defaultStatusId = statusOptions.find((status) => status.label === "New")?.value ?? statusOptions[0]?.value ?? "";
  const statusIdByLabel = useMemo(
    () => new Map(statusOptions.map((status) => [status.label, status.value])),
    [statusOptions],
  );

  useEffect(() => {
    const controller = new AbortController();

    getContactStatusOptions({ signal: controller.signal })
      .then((options) => {
        if (controller.signal.aborted) return;

        setStatusOptions(options);
      })
      .catch((caught) => {
        if (!isAbortError(caught)) {
          setLoadError(caught instanceof Error ? caught.message : "Unable to load contact statuses.");
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!defaultStatusId) return;

    setCreateDraft((draft) => (draft.statusId ? draft : updateDraft(draft, { statusId: defaultStatusId })));
  }, [defaultStatusId]);

  const handleQueryChange = useCallback((nextQuery: DataTableQueryState, context: DataTableQueryContext) => {
    setLoadError("");
    setIsLoading(true);

    getContactsPage(nextQuery, { signal: context.signal })
      .then((result) => {
        if (context.signal.aborted) return;

        setContacts(result.data);
        setTotalRows(result.total);
        setPageCount(result.pageCount);
      })
      .catch((caught) => {
        if (!isAbortError(caught)) {
          setLoadError(caught instanceof Error ? caught.message : "Unable to load contacts.");
        }
      })
      .finally(() => {
        if (!context.signal.aborted) {
          setIsLoading(false);
        }
      });
  }, []);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  useEffect(() => {
    if (!selectedContact) return;

    const draft = draftFromContact(selectedContact);
    setProfileDraft(draft);
    setAssignmentDraft(draft);
    setAssignmentOwnerDetails(members.find((user) => user.id === draft.ownerId) ?? null);
  }, [members, selectedContact]);

  const refreshContacts = () => setContactsRefreshKey((current) => current + 1);

  const loadMemberOptions = useCallback(
    async ({ search, page, pageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<MemberOption>> => {
      const result = await getMembersPage(
        {
          page,
          pageSize,
          search,
          sort: {
            columnId: "name",
            direction: "asc",
          },
        },
        { signal },
      );

      return {
        options: result.data.map(memberToOption),
        hasMore: result.page < result.pageCount,
      };
    },
    [],
  );

  const createOwnerValue = useMemo(() => (createOwnerDetails ? [memberToOption(createOwnerDetails)] : []), [createOwnerDetails]);
  const assignmentOwnerValue = useMemo(() => (assignmentOwnerDetails ? [memberToOption(assignmentOwnerDetails)] : []), [assignmentOwnerDetails]);

  const handleAssignmentOwnerChange = (selectedOptions: MemberOption[]) => {
    const owner = selectedOptions[0]?.member ?? null;

    setLoadError("");
    setAssignmentOwnerDetails(owner);
    setAssignmentDraft((draft) => updateDraft(draft, { ownerId: owner?.id ?? "" }));
  };

  const handleCreateOwnerChange = (selectedOptions: MemberOption[]) => {
    const owner = selectedOptions[0]?.member ?? null;

    setLoadError("");
    setCreateOwnerDetails(owner);
    setCreateDraft((draft) => updateDraft(draft, { ownerId: owner?.id ?? "" }));
  };

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);

    if (!open) {
      setCreateDraft(blankDraft("", defaultStatusId));
      setCreateOwnerDetails(null);
    }
  };

  const handleCreateContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can(PERMISSIONS.contacts.create)) return;

    setLoadError("");
    setIsMutating(true);

    try {
      await createContact(payloadFromDraft(createDraft));

      setCreateDraft(blankDraft("", defaultStatusId));
      setCreateOwnerDetails(null);
      setCreateOpen(false);
      refreshContacts();
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Unable to create contact.");
    } finally {
      setIsMutating(false);
    }
  };

  const openDetails = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setDetailOpen(true);
  };

  const saveProfile = async () => {
    if (!selectedContact || !canUpdateContacts) return;

    setLoadError("");
    setIsMutating(true);

    try {
      const contact = await updateContact(selectedContact.id, profilePayloadFromDraft(profileDraft));
      setContacts((current) => current.map((item) => (item.id === selectedContact.id ? contact : item)));
      refreshContacts();
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Unable to update contact.");
      throw caught;
    } finally {
      setIsMutating(false);
    }
  };

  const saveAssignment = async () => {
    if (!selectedContact || !canUpdateContacts) return;

    setLoadError("");
    setIsMutating(true);

    try {
      const contact = await updateContact(selectedContact.id, {
        ownerId: assignmentDraft.ownerId || null,
        lastContactedAt: nullableDate(assignmentDraft.lastContactedAt),
      });
      setContacts((current) => current.map((item) => (item.id === selectedContact.id ? contact : item)));
      refreshContacts();
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Unable to update contact assignment.");
      throw caught;
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.type === "delete" && !canDeleteContacts) return;
    if (pendingAction.type !== "delete" && !canUpdateContacts) return;

    setLoadError("");
    setIsMutating(true);

    try {
      if (pendingAction.type === "delete") {
        await deleteContact(pendingAction.contact.id);
        if (selectedContactId === pendingAction.contact.id) {
          setDetailOpen(false);
          setSelectedContactId(null);
        }
      } else {
        const nextStatusId = statusIdByLabel.get(pendingAction.type === "archive" ? "Dormant" : "New");

        if (!nextStatusId) {
          throw new Error("Contact status reference is unavailable.");
        }

        const contact = await updateContact(pendingAction.contact.id, {
          statusId: nextStatusId,
        });
        setContacts((current) => current.map((item) => (item.id === pendingAction.contact.id ? contact : item)));
      }

      setPendingAction(null);
      refreshContacts();
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Unable to update contact.");
      throw caught;
    } finally {
      setIsMutating(false);
    }
  };

  const selectedOwner = selectedContact ? members.find((user) => user.id === selectedContact.ownerId) : undefined;
  const actionLabel =
    pendingAction?.type === "delete" ? "Delete contact" : pendingAction?.type === "archive" ? "Archive contact" : "Activate contact";
  const actionDescription =
    pendingAction?.type === "delete"
      ? `${pendingAction.contact.firstName} ${pendingAction.contact.lastName} will be deleted from this tenant.`
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
              <DetailField label="First name" value={selectedContact.firstName} />
              <DetailField label="Last name" value={selectedContact.lastName} />
              <DetailField label="Email" value={selectedContact.email} />
              <DetailField label="Phone" value={selectedContact.phone || "Not provided"} />
              <DetailField label="Status" value={selectedContact.status} />
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
                  required
                  value={profileDraft.firstName}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { firstName: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-last-name">Last name</Label>
                <Input
                  id="profile-last-name"
                  required
                  value={profileDraft.lastName}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { lastName: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  required
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
                  value={profileDraft.statusId}
                  onChange={(event) => setProfileDraft(updateDraft(profileDraft, { statusId: event.target.value }))}
                >
                  {statusOptions.length === 0 && <option value="">Loading statuses...</option>}
                  {statusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
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
              <DetailField label="Last contacted" value={new Date(selectedContact.lastContactedAt).toLocaleDateString()} />
              <DetailField label="Owner role" value={selectedOwner?.role ?? "Not assigned"} />
              <DetailField label="Owner email" value={selectedOwner?.email ?? "Not assigned"} />
            </div>
          ),
          editContent: (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="assignment-owner">Owner</Label>
                <ServerMultiSelect<MemberOption>
                  id="assignment-owner"
                  value={assignmentOwnerValue}
                  onChange={handleAssignmentOwnerChange}
                  loadOptions={loadMemberOptions}
                  maxSelected={1}
                  placeholder="Choose owner"
                  searchPlaceholder="Search members..."
                  emptyLabel="No members found."
                />
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
              <ReadOnlyFormField
                id="assignment-owner-role"
                label="Owner role"
                value={assignmentOwnerDetails?.role ?? "Not assigned"}
              />
              <ReadOnlyFormField
                id="assignment-owner-email"
                label="Owner email"
                value={assignmentOwnerDetails?.email ?? "Not assigned"}
              />
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
              required
              value={createDraft.firstName}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { firstName: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-last-name">Last name</Label>
            <Input
              id="create-last-name"
              required
              value={createDraft.lastName}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { lastName: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              required
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
          <div className="grid gap-2">
            <Label htmlFor="create-status">Status</Label>
            <select
              id="create-status"
              className={inputClass}
              value={createDraft.statusId}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { statusId: event.target.value }))}
            >
              {statusOptions.length === 0 && <option value="">Loading statuses...</option>}
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
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
          <div className="grid gap-2 md:col-span-2">
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
    {
      value: "assignment",
      label: "Assignment",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="create-owner">Owner</Label>
            <ServerMultiSelect<MemberOption>
              id="create-owner"
              value={createOwnerValue}
              onChange={handleCreateOwnerChange}
              loadOptions={loadMemberOptions}
              maxSelected={1}
              placeholder="Choose owner"
              searchPlaceholder="Search members..."
              emptyLabel="No members found."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-contacted">Last contacted</Label>
            <Input
              id="create-contacted"
              type="date"
              value={createDraft.lastContactedAt}
              onChange={(event) => setCreateDraft(updateDraft(createDraft, { lastContactedAt: event.target.value }))}
            />
          </div>
          <ReadOnlyFormField
            id="create-owner-role"
            label="Owner role"
            value={createOwnerDetails?.role ?? "Not assigned"}
          />
          <ReadOnlyFormField
            id="create-owner-email"
            label="Owner email"
            value={createOwnerDetails?.email ?? "Not assigned"}
          />
        </div>
      ),
    },
  ];

  const contactColumns = useMemo<DataTableColumn<Contact>[]>(
    () => [
      {
        id: "contact",
        header: "Contact",
        cell: (contact) => (
          <>
            <p className="font-medium">{contactName(contact)}</p>
            <p className="text-xs text-muted-foreground">{contact.email}</p>
          </>
        ),
        searchValue: (contact) => `${contactName(contact)} ${contact.email}`,
      },
      {
        id: "status",
        header: "Status",
        cell: (contact) => <StatusBadge status={contact.status} />,
        searchValue: (contact) => contact.status,
      },
      {
        id: "owner",
        header: "Owner",
        cell: (contact) => members.find((user) => user.id === contact.ownerId)?.name ?? "Unassigned",
        searchValue: (contact) => members.find((user) => user.id === contact.ownerId)?.name ?? "Unassigned",
      },
      {
        id: "budget",
        header: "Budget",
        cell: (contact) => formatCurrency(contact.budget),
        searchValue: (contact) => String(contact.budget),
      },
      {
        id: "source",
        header: "Source",
        accessor: "source",
      },
      {
        id: "last-contacted",
        header: "Last contacted",
        cell: (contact) => new Date(contact.lastContactedAt).toLocaleDateString(),
        searchValue: (contact) => new Date(contact.lastContactedAt).toLocaleDateString(),
      },
    ],
    [members],
  );

  const contactFilters = useMemo<DataTableFilter<Contact>[]>(
    () => [
      {
        id: "status",
        label: "Status",
        defaultValue: "all",
        options: [
          { label: "All statuses", value: "all" },
          ...statusOptions,
        ],
        predicate: (contact, selectedValue) => selectedValue === "all" || contact.statusId === selectedValue,
      },
    ],
    [statusOptions],
  );

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Contacts"
        description="Track buyer and seller leads with ownership, source, budget, and current status."
        actions={
          <PermissionGate permission={PERMISSIONS.contacts.create}>
            <CreateDialog
              title="Add lead"
              description="Capture profile, ownership, and source details for a new lead."
              submitLabel="Save lead"
              open={createOpen}
              onOpenChange={handleCreateOpenChange}
              isSubmitting={isMutating}
              onSubmit={handleCreateContact}
              tabs={createTabs}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Add lead
                </Button>
              }
            />
          </PermissionGate>
        }
      />

      {loadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>}

      <DataTable
        actions={(contact) => {
          const isDormant = contact.status === "Dormant";

          return (
            <>
              <Button variant="outline" size="icon" title="View contact details" aria-label="View contact details" onClick={() => openDetails(contact)}>
                <Eye className="h-4 w-4" />
              </Button>
              <PermissionGate permission={PERMISSIONS.contacts.update}>
                <Button
                  variant="outline"
                  size="icon"
                  title={isDormant ? "Activate contact" : "Archive contact"}
                  aria-label={isDormant ? "Activate contact" : "Archive contact"}
                  onClick={() => setPendingAction({ type: isDormant ? "activate" : "archive", contact })}
                >
                  {isDormant ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.contacts.delete}>
                <Button
                  variant="outline"
                  size="icon"
                  title="Delete contact"
                  aria-label="Delete contact"
                  onClick={() => setPendingAction({ type: "delete", contact })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </PermissionGate>
            </>
          );
        }}
        columns={contactColumns}
        data={contacts}
        emptyMessage={isLoading ? "Loading contacts..." : "No contacts found."}
        filters={contactFilters}
        initialPageSize={10}
        isLoading={isLoading}
        onQueryChange={handleQueryChange}
        refreshKey={contactsRefreshKey}
        rowKey="id"
        search={{ enabled: true, placeholder: "Search contacts, email, or source" }}
        serverPageCount={pageCount}
        serverSide
        serverTotalRows={totalRows}
        toolbarEnd={isLoading ? <LoadingInline label="Loading" /> : null}
      />

      {selectedContact && (
        <DetailDialog
          title={contactName(selectedContact)}
          description="Profile, ownership, and recent contact context."
          open={detailOpen}
          editable={canUpdateContacts}
          isSubmitting={isMutating}
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
          isSubmitting={isMutating}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
