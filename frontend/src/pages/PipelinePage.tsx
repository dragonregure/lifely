import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarPlus, Plus, UserCheck } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ServerMultiSelect,
  type ServerMultiSelectLoadParams,
  type ServerMultiSelectLoadResult,
  type ServerMultiSelectOption,
} from "@/components/ui/server-multi-select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { cn, formatCurrency } from "@/lib/utils";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import { getContactsPage, getListingsPage, getMembersPage, getPipelineDeals, updatePipelineDeal, type PipelineDealPayload } from "@/services/api";
import type { AppLayoutContext } from "@/components/AppLayout";
import type { Contact, Listing, PipelineDeal, PipelineSource, PipelineStage, User } from "@/types";

const stages: PipelineStage[] = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Viewing Scheduled",
  "Viewed",
  "Negotiating",
  "Closed Won",
  "Closed Lost",
  "Dormant",
];

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
] as const;

const MANUAL_ENTRY_SOURCE: PipelineSource = "Manual Entry";
const PIPELINE_BOARD_INCLUDES = ["contact", "listing", "user"] as const;

type ContactOption = ServerMultiSelectOption & {
  contact: Contact;
};

type ListingOption = ServerMultiSelectOption & {
  listing: Listing;
};

type AssigneeOption = ServerMultiSelectOption & {
  user: User;
};

type PipelineDraft = {
  contact: Contact | null;
  listing: Listing | null;
  assignee: User | null;
  stage: PipelineStage;
  isActive: boolean;
  nextTask: string;
};

function contactName(contact: Contact) {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

function contactToOption(contact: Contact): ContactOption {
  return {
    value: contact.id,
    label: contactName(contact),
    description: contact.email,
    contact,
  };
}

function listingToOption(listing: Listing): ListingOption {
  return {
    value: listing.id,
    label: listing.title,
    description: formatCurrency(listing.price),
    listing,
  };
}

function userToOption(user: User): AssigneeOption {
  return {
    value: user.id,
    label: user.name,
    description: user.email,
    user,
  };
}

function draftFromDeal(deal: PipelineDeal, members: User[]): PipelineDraft {
  return {
    contact: deal.contact ?? null,
    listing: deal.listing ?? null,
    assignee: deal.user ?? members.find((member) => member.id === deal.userId) ?? null,
    stage: deal.stage,
    isActive: deal.isActive,
    nextTask: deal.nextTask ?? "",
  };
}

function changedPipelinePayload(deal: PipelineDeal, draft: PipelineDraft, permissions: PipelineEditPermissions): Partial<PipelineDealPayload> {
  const payload: Partial<PipelineDealPayload> = {};

  if (permissions.canEditManualFields) {
    if (draft.contact?.id && draft.contact.id !== deal.contactId) {
      payload.contactId = draft.contact.id;
    }

    if (draft.listing?.id && draft.listing.id !== deal.listingId) {
      payload.listingId = draft.listing.id;
    }
  }

  if ((permissions.canEditAssignee || permissions.canAssignToSelf) && draft.assignee?.id && draft.assignee.id !== deal.userId) {
    payload.userId = draft.assignee.id;
  }

  if (permissions.canEditProgress) {
    if (draft.stage !== deal.stage) {
      payload.stage = draft.stage;
    }

    if (draft.isActive !== deal.isActive) {
      payload.isActive = draft.isActive;
    }

    const nextTask = draft.nextTask.trim() || null;
    if (nextTask !== (deal.nextTask ?? null)) {
      payload.nextTask = nextTask;
    }
  }

  return payload;
}

type PipelineEditPermissions = {
  canEditManualFields: boolean;
  canEditAssignee: boolean;
  canAssignToSelf: boolean;
  canEditProgress: boolean;
};

type PipelineOverviewDialogProps = {
  deal: PipelineDeal | null;
  members: User[];
  currentUser: User | null;
  permissions: PipelineEditPermissions | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (deal: PipelineDeal) => void;
  loadContactOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ContactOption>>;
  loadListingOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ListingOption>>;
  loadAssigneeOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<AssigneeOption>>;
};

function PipelineOverviewDialog({
  deal,
  members,
  currentUser,
  permissions,
  onOpenChange,
  onSaved,
  loadContactOptions,
  loadListingOptions,
  loadAssigneeOptions,
}: PipelineOverviewDialogProps) {
  const [draft, setDraft] = useState<PipelineDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(deal ? draftFromDeal(deal, members) : null);
    setError(null);
  }, [deal, members]);

  if (!deal || !draft || !permissions) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const selectedContact = draft.contact ? [contactToOption(draft.contact)] : [];
  const selectedListing = draft.listing ? [listingToOption(draft.listing)] : [];
  const selectedAssignee = draft.assignee ? [userToOption(draft.assignee)] : [];
  const canSave = Boolean(draft.contact && draft.listing && draft.assignee);
  const overviewTitle = draft.contact ? contactName(draft.contact) : "Pipeline deal";

  const assignToCurrentUser = () => {
    if (!currentUser || !permissions.canAssignToSelf) return;
    setDraft((current) => (current ? { ...current, assignee: currentUser } : current));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      setError("Contact, listing, and assignee are required.");
      return;
    }

    const payload = changedPipelinePayload(deal, draft, permissions);

    setIsSaving(true);
    setError(null);

    try {
      const savedDeal = Object.keys(payload).length > 0 ? await updatePipelineDeal(deal.id, payload) : deal;
      onSaved({
        ...savedDeal,
        contact: draft.contact,
        listing: draft.listing,
        user: draft.assignee,
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save pipeline deal.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(deal)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pipeline card overview</DialogTitle>
          <DialogDescription>{overviewTitle}</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pipeline-contact">Contact Name</Label>
              <ServerMultiSelect<ContactOption>
                id="pipeline-contact"
                value={selectedContact}
                onChange={(value) => setDraft((current) => (current ? { ...current, contact: value[0]?.contact ?? null } : current))}
                loadOptions={loadContactOptions}
                placeholder="Select contact"
                searchPlaceholder="Search contacts..."
                emptyLabel="No contacts found."
                maxSelected={1}
                disabled={!permissions.canEditManualFields}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pipeline-listing">Listing Title</Label>
              <ServerMultiSelect<ListingOption>
                id="pipeline-listing"
                value={selectedListing}
                onChange={(value) => setDraft((current) => (current ? { ...current, listing: value[0]?.listing ?? null } : current))}
                loadOptions={loadListingOptions}
                placeholder="Select listing"
                searchPlaceholder="Search listings..."
                emptyLabel="No listings found."
                maxSelected={1}
                disabled={!permissions.canEditManualFields}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="pipeline-assignee">Assignee</Label>
              <ServerMultiSelect<AssigneeOption>
                id="pipeline-assignee"
                value={selectedAssignee}
                onChange={(value) => setDraft((current) => (current ? { ...current, assignee: value[0]?.user ?? null } : current))}
                loadOptions={loadAssigneeOptions}
                placeholder="Select assignee"
                searchPlaceholder="Search users..."
                emptyLabel="No users found."
                maxSelected={1}
                disabled={!permissions.canEditAssignee}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!permissions.canAssignToSelf || !currentUser || draft.assignee?.id === currentUser.id}
              onClick={assignToCurrentUser}
            >
              <UserCheck className="h-4 w-4" />
              Assign to me
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="pipeline-stage">Stage</Label>
              <select
                id="pipeline-stage"
                className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={draft.stage}
                disabled={!permissions.canEditProgress}
                onChange={(event) => setDraft((current) => (current ? { ...current, stage: event.target.value as PipelineStage } : current))}
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pipeline-source">Source</Label>
              <Input id="pipeline-source" value={deal.source} readOnly />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pipeline-status">Status</Label>
              <select
                id="pipeline-status"
                className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={draft.isActive ? "active" : "inactive"}
                disabled={!permissions.canEditProgress}
                onChange={(event) => setDraft((current) => (current ? { ...current, isActive: event.target.value === "active" } : current))}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pipeline-next-task">Next Task</Label>
            <Textarea
              id="pipeline-next-task"
              value={draft.nextTask}
              readOnly={!permissions.canEditProgress}
              onChange={(event) => setDraft((current) => (current ? { ...current, nextTask: event.target.value } : current))}
              placeholder="Add the next follow-up task"
            />
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canSave} isLoading={isSaving} loadingLabel="Saving">
              Save and Close
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PipelinePage() {
  const layoutContext = useOutletContext<AppLayoutContext | null>();
  const isSidebarMinimized = layoutContext?.isSidebarMinimized ?? false;
  const { user, members } = useAuth();
  const { can } = useAuthorization();
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPipelineDeals({ include: PIPELINE_BOARD_INCLUDES })
      .then(setDeals)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load pipeline."))
      .finally(() => setIsLoading(false));
  }, []);

  const loadContactOptions = useCallback(
    async ({ search, page, pageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<ContactOption>> => {
      const result = await getContactsPage(
        {
          page,
          pageSize,
          search,
          sort: { columnId: "contact", direction: "asc" },
        },
        { signal },
      );

      return {
        options: result.data.map(contactToOption),
        hasMore: result.page < result.pageCount,
      };
    },
    [],
  );

  const loadListingOptions = useCallback(
    async ({ search, page, pageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<ListingOption>> => {
      const result = await getListingsPage(
        {
          page,
          pageSize,
          search,
          sort: { columnId: "title", direction: "asc" },
        },
        { signal },
      );

      return {
        options: result.data.map(listingToOption),
        hasMore: result.page < result.pageCount,
      };
    },
    [],
  );

  const loadAssigneeOptions = useCallback(
    async ({ search, page, pageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<AssigneeOption>> => {
      const result = await getMembersPage(
        {
          page,
          pageSize,
          search,
          sort: { columnId: "name", direction: "asc" },
        },
        { signal },
      );

      return {
        options: result.data.map(userToOption),
        hasMore: result.page < result.pageCount,
      };
    },
    [],
  );

  const grouped = useMemo(() => {
    return stages.map((stage) => ({
      stage,
      deals: deals.filter((deal) => deal.stage === stage),
    }));
  }, [deals]);

  const selectedDealPermissions = useMemo<PipelineEditPermissions | null>(() => {
    if (!selectedDeal) return null;

    const canUpdatePipeline = can(PERMISSIONS.pipeline.update);
    const canEditAssignee = can(PERMISSIONS.pipeline.changeAssignee);
    const canAssignToSelf = can(PERMISSIONS.pipeline.assignToSelf);
    const isAssignee = selectedDeal.userId === user?.id;

    return {
      canEditManualFields: canUpdatePipeline && selectedDeal.source === MANUAL_ENTRY_SOURCE,
      canEditAssignee,
      canAssignToSelf,
      canEditProgress: canUpdatePipeline && isAssignee,
    };
  }, [can, selectedDeal, user?.id]);

  const handleSavedDeal = (deal: PipelineDeal) => {
    setDeals((current) => current.map((item) => (item.id === deal.id ? deal : item)));
    setSelectedDeal(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Pipeline"
        description="Move deals through the sales process and create the follow-up tasks that keep momentum visible."
        actions={
          <PermissionGate permission={PERMISSIONS.pipeline.create}>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  New deal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create pipeline task</DialogTitle>
                  <DialogDescription>The first-try win links a lead, listing, and follow-up task.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task-title">Task</Label>
                    <Input id="task-title" placeholder="Follow up after Saturday viewing" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-note">Notes</Label>
                    <Textarea id="task-note" placeholder="Buyer wants waterfront options below $900k." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="button">
                      <CalendarPlus className="h-4 w-4" />
                      Create dummy task
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </PermissionGate>
        }
      />

      {error ? <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      {isLoading ? (
        <LoadingState className="border bg-white" label="Loading pipeline" />
      ) : (
        <div
          className={cn(
            "grid grid-flow-col gap-2 overflow-x-auto pb-2 xl:grid-flow-row xl:grid-cols-9",
            isSidebarMinimized ? "auto-cols-[11rem] xl:overflow-visible" : "auto-cols-[10rem] xl:overflow-x-auto",
          )}
        >
          {grouped.map((column) => (
            <div key={column.stage} className="min-w-0">
              <div className={cn("mb-2 flex items-start gap-2", isSidebarMinimized && "min-h-10")}>
                <h2
                  className={cn("min-w-0 flex-1 text-sm font-semibold leading-tight", isSidebarMinimized ? "whitespace-normal break-words" : "truncate")}
                  title={column.stage}
                >
                  {column.stage}
                </h2>
                <span
                  className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-muted-foreground"
                  aria-label={`${column.stage} deal count`}
                >
                  {column.deals.length}
                </span>
              </div>
              <div className="grid gap-3">
                {column.deals.map((deal) => {
                  const contact = deal.contact;
                  const listing = deal.listing;
                  const displayName = contact ? contactName(contact) : "Unassigned contact";

                  return (
                    <button
                      key={deal.id}
                      type="button"
                      className="min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-ring"
                      onClick={() => setSelectedDeal(deal)}
                    >
                      <Card className="min-w-0 overflow-hidden shadow-sm transition hover:border-primary/40 hover:shadow-md">
                        <CardContent className="min-w-0 p-3">
                          <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{listing?.title ?? "Unassigned listing"}</p>
                          <p className="mt-2 truncate text-sm font-semibold">{formatCurrency(deal.value)}</p>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <PipelineOverviewDialog
        deal={selectedDeal}
        members={members}
        currentUser={user}
        permissions={selectedDealPermissions}
        onOpenChange={(open) => {
          if (!open) setSelectedDeal(null);
        }}
        onSaved={handleSavedDeal}
        loadContactOptions={loadContactOptions}
        loadListingOptions={loadListingOptions}
        loadAssigneeOptions={loadAssigneeOptions}
      />
    </div>
  );
}
