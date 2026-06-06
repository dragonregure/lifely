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
import type { ServerMultiSelectLoadParams, ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";
import { useAuth } from "@/context/AuthContext";
import {
  createContact,
  deleteContact,
  getContactsPage,
  getMembersPage,
  updateContact,
} from "@/services/api";
import { isAbortError } from "@/services/httpClient";
import { formatCurrency } from "@/lib/utils";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import { ContactAssignmentFields, ContactAssignmentView, ContactProfileFields, ContactProfileView } from "./contacts/ContactFields";
import type { ContactDraft, MemberOption, PendingContactAction } from "./contacts/contactTypes";
import { CONTACT_SOURCE_OPTIONS, CONTACT_STATUS_OPTIONS } from "./contacts/contactConstants";
import {
  blankDraft,
  contactName,
  draftFromContact,
  memberToOption,
  nullableDate,
  payloadFromDraft,
  profilePayloadFromDraft,
  updateDraft,
} from "./contacts/contactUtils";
import type { Contact, User } from "@/types";

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
      setCreateDraft(blankDraft());
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

      setCreateDraft(blankDraft());
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
        const contact = await updateContact(pendingAction.contact.id, {
          status: pendingAction.type === "activate",
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
    pendingAction?.type === "delete" ? "Delete contact" : pendingAction?.type === "deactivate" ? "Deactivate contact" : "Activate contact";
  const actionDescription =
    pendingAction?.type === "delete"
      ? `${pendingAction.contact.firstName} ${pendingAction.contact.lastName} will be deleted from this tenant.`
      : pendingAction?.type === "deactivate"
        ? `${pendingAction.contact.firstName} ${pendingAction.contact.lastName} will be marked inactive.`
        : `${pendingAction?.contact.firstName} ${pendingAction?.contact.lastName} will be marked active.`;

  const detailTabs: DetailDialogTab[] | undefined = selectedContact
    ? [
        {
          value: "profile",
          label: "Profile",
          viewContent: <ContactProfileView contact={selectedContact} />,
          editContent: <ContactProfileFields fieldPrefix="profile" draft={profileDraft} setDraft={setProfileDraft} />,
          onSave: saveProfile,
        },
        {
          value: "assignment",
          label: "Assignment",
          viewContent: <ContactAssignmentView contact={selectedContact} owner={selectedOwner} />,
          editContent: (
            <ContactAssignmentFields
              fieldPrefix="assignment"
              draft={assignmentDraft}
              ownerDetails={assignmentOwnerDetails}
              ownerValue={assignmentOwnerValue}
              loadMemberOptions={loadMemberOptions}
              onOwnerChange={handleAssignmentOwnerChange}
              setDraft={setAssignmentDraft}
            />
          ),
          onSave: saveAssignment,
        },
      ]
    : undefined;

  const createTabs: CreateDialogTab[] = [
    {
      value: "profile",
      label: "Profile",
      content: <ContactProfileFields fieldPrefix="create" draft={createDraft} setDraft={setCreateDraft} />,
    },
    {
      value: "assignment",
      label: "Assignment",
      content: (
        <ContactAssignmentFields
          fieldPrefix="create"
          draft={createDraft}
          ownerDetails={createOwnerDetails}
          ownerValue={createOwnerValue}
          loadMemberOptions={loadMemberOptions}
          onOwnerChange={handleCreateOwnerChange}
          setDraft={setCreateDraft}
        />
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
        options: [...CONTACT_STATUS_OPTIONS],
        predicate: (contact, selectedValue) => selectedValue === "all" || contact.status.toLowerCase() === selectedValue,
      },
      {
        id: "owner_id",
        label: "Owner",
        type: "multi-select",
        defaultValue: "all",
        loadOptions: async (params) => {
          const result = await loadMemberOptions(params);

          return {
            options: result.options.map(({ value, label, description }) => ({ value, label, description })),
            hasMore: result.hasMore,
          };
        },
        predicate: (contact, selectedValue) => selectedValue.split(",").some((ownerId) => ownerId === contact.ownerId),
      },
      {
        id: "source",
        label: "Source",
        type: "multi-select",
        defaultValue: "all",
        options: CONTACT_SOURCE_OPTIONS,
        predicate: (contact, selectedValue) => selectedValue.split(",").some((sourceId) => sourceId === String(contact.sourceId)),
      },
    ],
    [loadMemberOptions],
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
          const isInactive = !contact.statusValue;

          return (
            <>
              <Button variant="outline" size="icon" title="View contact details" aria-label="View contact details" onClick={() => openDetails(contact)}>
                <Eye className="h-4 w-4" />
              </Button>
              <PermissionGate permission={PERMISSIONS.contacts.update}>
                <Button
                  variant="outline"
                  size="icon"
                  title={isInactive ? "Activate contact" : "Deactivate contact"}
                  aria-label={isInactive ? "Activate contact" : "Deactivate contact"}
                  onClick={() => setPendingAction({ type: isInactive ? "activate" : "deactivate", contact })}
                >
                  {isInactive ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
          confirmLabel={pendingAction.type === "delete" ? "Delete" : pendingAction.type === "deactivate" ? "Deactivate" : "Activate"}
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
