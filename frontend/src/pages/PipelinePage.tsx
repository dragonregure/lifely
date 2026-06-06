import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Search, SlidersHorizontal, UserCheck, X } from "lucide-react";
import { CircleAvatar } from "@/components/CircleAvatar";
import { LoadingState } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import {
  createPipelineDeal,
  getContactsPage,
  getListingsPage,
  getMembersPage,
  getPipelineDealsPage,
  updatePipelineDeal,
  type PipelineDealPayload,
} from "@/services/api";
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

const pipelineSources: PipelineSource[] = [
  "Manual Entry",
  "Website",
  "Listing Inquiry",
  "Social Media",
  "Referral",
  "Phone Call",
  "Messaging",
  "Email",
  "Paid Ads",
  "Portal",
  "Exhibition",
  "Integration",
];

type ContactOption = ServerMultiSelectOption & {
  contact: Contact;
};

type ListingOption = ServerMultiSelectOption & {
  listing: Listing;
};

type AssigneeOption = ServerMultiSelectOption & {
  user: User;
};

type SourceOption = ServerMultiSelectOption & {
  source: PipelineSource;
};

type PipelineDraft = {
  contact: Contact | null;
  listing: Listing | null;
  assignee: User | null;
  stage: PipelineStage;
  isActive: boolean;
  nextTask: string;
};

type PipelineFilters = {
  search: string;
  assignees: AssigneeOption[];
  sources: SourceOption[];
};

const emptyPipelineFilters: PipelineFilters = {
  search: "",
  assignees: [],
  sources: [],
};

function useDebouncedValue<TValue>(value: TValue, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

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

function sourceToOption(source: PipelineSource): SourceOption {
  return {
    value: source,
    label: source,
    source,
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

type PipelineCreatePermissions = {
  canChangeAssignee: boolean;
  canAssignToSelf: boolean;
};

type PipelineCreateDialogProps = {
  open: boolean;
  currentUser: User | null;
  permissions: PipelineCreatePermissions;
  onOpenChange: (open: boolean) => void;
  onCreated: (deal: PipelineDeal) => void;
  loadContactOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ContactOption>>;
  loadListingOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ListingOption>>;
  loadAssigneeOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<AssigneeOption>>;
};

function createPipelineDraft(currentUser: User | null): PipelineDraft {
  return {
    contact: null,
    listing: null,
    assignee: currentUser,
    stage: "New Lead",
    isActive: true,
    nextTask: "",
  };
}

function PipelineCreateDialog({
  open,
  currentUser,
  permissions,
  onOpenChange,
  onCreated,
  loadContactOptions,
  loadListingOptions,
  loadAssigneeOptions,
}: PipelineCreateDialogProps) {
  const [draft, setDraft] = useState<PipelineDraft>(() => createPipelineDraft(currentUser));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(createPipelineDraft(currentUser));
      setError(null);
    }
  }, [currentUser, open]);

  const selectedContact = draft.contact ? [contactToOption(draft.contact)] : [];
  const selectedListing = draft.listing ? [listingToOption(draft.listing)] : [];
  const selectedAssignee = draft.assignee ? [userToOption(draft.assignee)] : [];
  const canUseSelectedAssignee =
    permissions.canChangeAssignee || Boolean(permissions.canAssignToSelf && currentUser && draft.assignee?.id === currentUser.id);
  const canSave = Boolean(draft.contact && draft.listing && draft.assignee && canUseSelectedAssignee);

  const assignToCurrentUser = () => {
    if (!currentUser || !permissions.canAssignToSelf) return;
    setDraft((current) => ({ ...current, assignee: currentUser }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.contact || !draft.listing || !draft.assignee) {
      setError("Contact, listing, and assignee are required.");
      return;
    }

    if (!canUseSelectedAssignee) {
      setError("You do not have permission to set this pipeline assignee.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const savedDeal = await createPipelineDeal({
        contactId: draft.contact.id,
        listingId: draft.listing.id,
        userId: draft.assignee.id,
        stage: draft.stage,
        isActive: draft.isActive,
        nextTask: draft.nextTask.trim() || null,
      });

      onCreated({
        ...savedDeal,
        contact: draft.contact,
        listing: draft.listing,
        user: draft.assignee,
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create pipeline deal.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create pipeline deal</DialogTitle>
          <DialogDescription>Manual Entry</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="new-pipeline-contact">Contact Name</Label>
              <ServerMultiSelect<ContactOption>
                id="new-pipeline-contact"
                value={selectedContact}
                onChange={(value) => setDraft((current) => ({ ...current, contact: value[0]?.contact ?? null }))}
                loadOptions={loadContactOptions}
                placeholder="Select contact"
                searchPlaceholder="Search contacts..."
                emptyLabel="No contacts found."
                maxSelected={1}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-pipeline-listing">Listing Title</Label>
              <ServerMultiSelect<ListingOption>
                id="new-pipeline-listing"
                value={selectedListing}
                onChange={(value) => setDraft((current) => ({ ...current, listing: value[0]?.listing ?? null }))}
                loadOptions={loadListingOptions}
                placeholder="Select listing"
                searchPlaceholder="Search listings..."
                emptyLabel="No listings found."
                maxSelected={1}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="new-pipeline-assignee">Assignee</Label>
              <ServerMultiSelect<AssigneeOption>
                id="new-pipeline-assignee"
                value={selectedAssignee}
                onChange={(value) => setDraft((current) => ({ ...current, assignee: value[0]?.user ?? null }))}
                loadOptions={loadAssigneeOptions}
                placeholder="Select assignee"
                searchPlaceholder="Search users..."
                emptyLabel="No users found."
                maxSelected={1}
                disabled={!permissions.canChangeAssignee}
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
              <Label htmlFor="new-pipeline-stage">Stage</Label>
              <select
                id="new-pipeline-stage"
                className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.stage}
                onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value as PipelineStage }))}
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-pipeline-source">Source</Label>
              <Input id="new-pipeline-source" value={MANUAL_ENTRY_SOURCE} readOnly />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-pipeline-status">Status</Label>
              <select
                id="new-pipeline-status"
                className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={draft.isActive ? "active" : "inactive"}
                onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.value === "active" }))}
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
            <Label htmlFor="new-pipeline-next-task">Next Task</Label>
            <Textarea
              id="new-pipeline-next-task"
              value={draft.nextTask}
              onChange={(event) => setDraft((current) => ({ ...current, nextTask: event.target.value }))}
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

type PipelineFiltersMenuProps = {
  filters: PipelineFilters;
  onChange: (filters: PipelineFilters) => void;
  loadAssigneeOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<AssigneeOption>>;
  loadSourceOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<SourceOption>>;
};

function activeFilterCount(filters: PipelineFilters) {
  return filters.assignees.length + filters.sources.length;
}

function searchableDealText(deal: PipelineDeal) {
  return [
    deal.contact ? contactName(deal.contact) : "",
    deal.contact?.email ?? "",
    deal.listing?.title ?? "",
    deal.user?.name ?? "",
    deal.user?.email ?? "",
    deal.source,
    deal.stage,
    deal.nextTask ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function dealMatchesFilters(deal: PipelineDeal, filters: PipelineFilters) {
  if (filters.assignees.length > 0 && !filters.assignees.some((assignee) => assignee.value === deal.userId)) {
    return false;
  }

  if (filters.sources.length > 0 && !filters.sources.some((source) => source.value === deal.source)) {
    return false;
  }

  const search = filters.search.trim().toLowerCase();
  if (search && !searchableDealText(deal).includes(search)) {
    return false;
  }

  return true;
}

function PipelineFiltersMenu({ filters, onChange, loadAssigneeOptions, loadSourceOptions }: PipelineFiltersMenuProps) {
  const count = activeFilterCount(filters);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" aria-label="Open pipeline filters">
          <SlidersHorizontal className="h-4 w-4" />
          Filters{count > 0 ? ` (${count})` : ""}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pipeline-filter-assignee">Assignee</Label>
            <ServerMultiSelect<AssigneeOption>
              id="pipeline-filter-assignee"
              value={filters.assignees}
              onChange={(assignees) => onChange({ ...filters, assignees })}
              loadOptions={loadAssigneeOptions}
              placeholder="Select assignees"
              searchPlaceholder="Search users..."
              emptyLabel="No users found."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pipeline-filter-source">Source</Label>
            <ServerMultiSelect<SourceOption>
              id="pipeline-filter-source"
              value={filters.sources}
              onChange={(sources) => onChange({ ...filters, sources })}
              loadOptions={loadSourceOptions}
              placeholder="Select sources"
              searchPlaceholder="Search sources..."
              emptyLabel="No sources found."
            />
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" disabled={count === 0} onClick={() => onChange({ ...filters, assignees: [], sources: [] })}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PipelinePage() {
  const layoutContext = useOutletContext<AppLayoutContext | null>();
  const isSidebarMinimized = layoutContext?.isSidebarMinimized ?? false;
  const { user, members } = useAuth();
  const { can } = useAuthorization();
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [movingDealIds, setMovingDealIds] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PipelineFilters>(emptyPipelineFilters);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const assigneeFilter = useMemo(() => filters.assignees.map((assignee) => assignee.value).join(","), [filters.assignees]);
  const sourceFilter = useMemo(() => filters.sources.map((source) => source.value).join(","), [filters.sources]);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    getPipelineDealsPage(
      {
        page: 1,
        pageSize: 100,
        search: debouncedSearch,
        filters: {
          user_id: assigneeFilter,
          source: sourceFilter,
        },
      },
      { include: PIPELINE_BOARD_INCLUDES, signal: controller.signal },
    )
      .then((result) => setDeals(result.data))
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load pipeline.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [assigneeFilter, debouncedSearch, sourceFilter]);

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

  const loadSourceOptions = useCallback(
    async ({ search, page, pageSize }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<SourceOption>> => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchingOptions = pipelineSources
        .filter((source) => source.toLowerCase().includes(normalizedSearch))
        .map(sourceToOption);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      return {
        options: matchingOptions.slice(start, end),
        hasMore: end < matchingOptions.length,
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

  const canMoveDeal = useCallback(
    (deal: PipelineDeal) => can(PERMISSIONS.pipeline.update) && deal.userId === user?.id,
    [can, user?.id],
  );

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

  const createPermissions = useMemo<PipelineCreatePermissions>(
    () => ({
      canChangeAssignee: can(PERMISSIONS.pipeline.changeAssignee),
      canAssignToSelf: can(PERMISSIONS.pipeline.assignToSelf),
    }),
    [can],
  );

  const handleCreatedDeal = (deal: PipelineDeal) => {
    setDeals((current) => (dealMatchesFilters(deal, filters) ? [deal, ...current] : current));
  };

  const handleSavedDeal = (deal: PipelineDeal) => {
    setDeals((current) => (dealMatchesFilters(deal, filters) ? current.map((item) => (item.id === deal.id ? deal : item)) : current.filter((item) => item.id !== deal.id)));
    setSelectedDeal(null);
  };

  const handleCardDragStart = (event: DragEvent<HTMLButtonElement>, deal: PipelineDeal) => {
    if (!canMoveDeal(deal)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", deal.id);
    setDraggedDealId(deal.id);
    setError(null);
  };

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, stage: PipelineStage) => {
    if (!draggedDealId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleColumnDragLeave = (event: DragEvent<HTMLDivElement>, stage: PipelineStage) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragOverStage((current) => (current === stage ? null : current));
    }
  };

  const handleCardDrop = async (event: DragEvent<HTMLDivElement>, targetStage: PipelineStage) => {
    event.preventDefault();

    const dealId = event.dataTransfer.getData("text/plain") || draggedDealId;
    const deal = deals.find((item) => item.id === dealId);
    setDraggedDealId(null);
    setDragOverStage(null);

    if (!deal || deal.stage === targetStage) {
      return;
    }

    if (!canMoveDeal(deal)) {
      setError("You do not have permission to move this pipeline card.");
      return;
    }

    const previousStage = deal.stage;
    setDeals((current) => current.map((item) => (item.id === deal.id ? { ...item, stage: targetStage } : item)));
    setMovingDealIds((current) => (current.includes(deal.id) ? current : [...current, deal.id]));
    setError(null);

    try {
      const savedDeal = await updatePipelineDeal(deal.id, { stage: targetStage });
      setDeals((current) =>
        current.map((item) =>
          item.id === deal.id
            ? {
                ...item,
                ...savedDeal,
                contact: item.contact,
                listing: item.listing,
                user: item.user,
              }
            : item,
        ),
      );
    } catch (caught) {
      setDeals((current) => current.map((item) => (item.id === deal.id ? { ...item, stage: previousStage } : item)));
      setError(caught instanceof Error ? caught.message : "Unable to move pipeline card.");
    } finally {
      setMovingDealIds((current) => current.filter((id) => id !== deal.id));
    }
  };

  const handleCardDragEnd = () => {
    setDraggedDealId(null);
    setDragOverStage(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Pipeline"
        description="Move deals through the sales process and create the follow-up tasks that keep momentum visible."
        actions={
          <PermissionGate permission={PERMISSIONS.pipeline.create}>
            <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New deal
            </Button>
          </PermissionGate>
        }
      />

      {error ? <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <Label htmlFor="pipeline-search" className="sr-only">
            Search
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="pipeline-search"
              className="pl-9"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search contact, listing, or assignee"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <PipelineFiltersMenu
            filters={filters}
            onChange={setFilters}
            loadAssigneeOptions={loadAssigneeOptions}
            loadSourceOptions={loadSourceOptions}
          />
        </div>
      </div>

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
            <div
              key={column.stage}
              className={cn(
                "min-h-56 min-w-0 rounded-lg border border-transparent p-1 transition-colors",
                dragOverStage === column.stage && "border-primary/40 bg-primary/5",
              )}
              onDragOver={(event) => handleColumnDragOver(event, column.stage)}
              onDragLeave={(event) => handleColumnDragLeave(event, column.stage)}
              onDrop={(event) => handleCardDrop(event, column.stage)}
            >
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
              <div className="grid min-h-32 content-start gap-3">
                {column.deals.map((deal) => {
                  const contact = deal.contact;
                  const listing = deal.listing;
                  const assignee = deal.user;
                  const displayName = contact ? contactName(contact) : "Unassigned contact";
                  const isMovable = canMoveDeal(deal);
                  const isDragging = draggedDealId === deal.id;
                  const isMoving = movingDealIds.includes(deal.id);

                  return (
                    <button
                      key={deal.id}
                      type="button"
                      draggable={isMovable && !isMoving}
                      className={cn(
                        "min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-ring",
                        isMovable && "cursor-grab active:cursor-grabbing",
                        isDragging && "opacity-60",
                        isMoving && "cursor-wait opacity-70",
                      )}
                      onClick={() => setSelectedDeal(deal)}
                      onDragStart={(event) => handleCardDragStart(event, deal)}
                      onDragEnd={handleCardDragEnd}
                      aria-label={`${displayName} pipeline card${isMovable ? ". Drag to move between stages." : ""}`}
                    >
                      <Card className="min-w-0 overflow-hidden shadow-sm transition hover:border-primary/40 hover:shadow-md">
                        <CardContent className="min-w-0 p-3">
                          <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{listing?.title ?? "Unassigned listing"}</p>
                          <div className="mt-2 flex min-h-7 items-end justify-between gap-2">
                            <p className="min-w-0 truncate text-sm font-semibold">{formatCurrency(deal.value)}</p>
                            {assignee ? (
                              <CircleAvatar
                                name={assignee.name}
                                initials={assignee.avatarInitials}
                                size="sm"
                                aria-label={`Assigned to ${assignee.name}`}
                              />
                            ) : null}
                          </div>
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

      <PipelineCreateDialog
        open={isCreateDialogOpen}
        currentUser={user}
        permissions={createPermissions}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={handleCreatedDeal}
        loadContactOptions={loadContactOptions}
        loadListingOptions={loadListingOptions}
        loadAssigneeOptions={loadAssigneeOptions}
      />
    </div>
  );
}
