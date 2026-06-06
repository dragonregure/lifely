import { useEffect, useState, type FormEvent } from "react";
import { UserCheck } from "lucide-react";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ServerMultiSelect, type ServerMultiSelectLoadParams, type ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";
import { Textarea } from "@/components/ui/textarea";
import { createLeadDeal, updateLeadDeal, type LeadDealPayload } from "@/services/api";
import type { LeadDeal, LeadStage, User } from "@/types";
import { MANUAL_ENTRY_SOURCE, LEAD_STAGES, LEAD_STATUS_OPTIONS } from "./leadConstants";
import type { AssigneeOption, ContactOption, ListingOption, LeadCreatePermissions, LeadEditPermissions } from "./leadTypes";
import {
  changedLeadPayload,
  contactName,
  contactToOption,
  createLeadDraft,
  draftFromDeal,
  hasLeadDealProblem,
  isClosedLeadStage,
  listingToOption,
  userToOption,
} from "./leadUtils";

type LeadCreateDialogProps = {
  open: boolean;
  currentUser: User | null;
  permissions: LeadCreatePermissions;
  onOpenChange: (open: boolean) => void;
  onCreated: (deal: LeadDeal) => void;
  loadContactOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ContactOption>>;
  loadListingOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ListingOption>>;
  loadAssigneeOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<AssigneeOption>>;
};

export function LeadCreateDialog({
  open,
  currentUser,
  permissions,
  onOpenChange,
  onCreated,
  loadContactOptions,
  loadListingOptions,
  loadAssigneeOptions,
}: LeadCreateDialogProps) {
  const [draft, setDraft] = useState(() => createLeadDraft(currentUser));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(createLeadDraft(currentUser));
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
      setError("You do not have permission to set this lead assignee.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const savedDeal = await createLeadDeal({
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
      setError(caught instanceof Error ? caught.message : "Unable to create lead.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create lead deal</DialogTitle>
          <DialogDescription>Manual Entry</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="new-lead-contact">Contact Name</Label>
              <ServerMultiSelect<ContactOption>
                id="new-lead-contact"
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
              <Label htmlFor="new-lead-listing">Listing Title</Label>
              <ServerMultiSelect<ListingOption>
                id="new-lead-listing"
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
              <Label htmlFor="new-lead-assignee">Assignee</Label>
              <ServerMultiSelect<AssigneeOption>
                id="new-lead-assignee"
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
            <Button type="button" variant="outline" disabled={!permissions.canAssignToSelf || !currentUser || draft.assignee?.id === currentUser.id} onClick={assignToCurrentUser}>
              <UserCheck className="h-4 w-4" />
              Assign to me
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="new-lead-stage">Stage</Label>
              <Select id="new-lead-stage" value={draft.stage} onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value as LeadStage }))}>
                {LEAD_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-lead-source">Source</Label>
              <Input id="new-lead-source" value={MANUAL_ENTRY_SOURCE} readOnly />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-lead-status">Status</Label>
              <Select id="new-lead-status" value={draft.isActive ? "active" : "inactive"} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.value === "active" }))}>
                {LEAD_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-lead-next-task">Next Task</Label>
            <Textarea
              id="new-lead-next-task"
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

type LeadOverviewDialogProps = {
  deal: LeadDeal | null;
  members: User[];
  currentUser: User | null;
  permissions: LeadEditPermissions | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (deal: LeadDeal) => void;
  loadContactOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ContactOption>>;
  loadListingOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ListingOption>>;
  loadAssigneeOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<AssigneeOption>>;
};

export function LeadOverviewDialog({
  deal,
  members,
  currentUser,
  permissions,
  onOpenChange,
  onSaved,
  loadContactOptions,
  loadListingOptions,
  loadAssigneeOptions,
}: LeadOverviewDialogProps) {
  const [draft, setDraft] = useState(() => (deal ? draftFromDeal(deal, members) : null));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingClosePayload, setPendingClosePayload] = useState<Partial<LeadDealPayload> | null>(null);

  useEffect(() => {
    setDraft(deal ? draftFromDeal(deal, members) : null);
    setError(null);
    setPendingClosePayload(null);
  }, [deal, members]);

  if (!deal || !draft || !permissions) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const selectedContact = draft.contact ? [contactToOption(draft.contact)] : [];
  const selectedListing = draft.listing ? [listingToOption(draft.listing)] : [];
  const selectedAssignee = draft.assignee ? [userToOption(draft.assignee)] : [];
  const canSave = Boolean(draft.contact && draft.listing && draft.assignee);
  const overviewTitle = draft.contact ? contactName(draft.contact) : "lead deal";
  const hasProblem = hasLeadDealProblem(deal);
  const statusOptions = hasProblem && deal.isActive ? LEAD_STATUS_OPTIONS.filter((status) => status.value === "active" || status.value === "inactive") : LEAD_STATUS_OPTIONS;

  const assignToCurrentUser = () => {
    if (!currentUser || !permissions.canAssignToSelf) return;
    setDraft((current) => (current ? { ...current, assignee: currentUser } : current));
  };

  const saveDeal = async (payload: Partial<LeadDealPayload>) => {
    if (!canSave) {
      setError("Contact, listing, and assignee are required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const savedDeal = Object.keys(payload).length > 0 ? await updateLeadDeal(deal.id, payload) : deal;
      onSaved({
        ...savedDeal,
        contact: draft.contact,
        listing: payload.stage === "Closed Won" && draft.listing ? { ...draft.listing, status: 4 } : draft.listing,
        user: draft.assignee,
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save lead.");
      throw caught;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = changedLeadPayload(deal, draft, permissions);

    if (payload.stage && isClosedLeadStage(payload.stage as LeadStage)) {
      setPendingClosePayload(payload);
      return;
    }

    try {
      await saveDeal(payload);
    } catch {
      // Error state is shown in the dialog.
    }
  };

  const confirmCloseStageSave = async () => {
    if (!pendingClosePayload) return;

    await saveDeal(pendingClosePayload);
    setPendingClosePayload(null);
  };

  return (
    <>
      <Dialog open={Boolean(deal)} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>lead card overview</DialogTitle>
            <DialogDescription>{overviewTitle}</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="lead-contact">Contact Name</Label>
                <ServerMultiSelect<ContactOption>
                  id="lead-contact"
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
                <Label htmlFor="lead-listing">Listing Title</Label>
                <ServerMultiSelect<ListingOption>
                  id="lead-listing"
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
                <Label htmlFor="lead-assignee">Assignee</Label>
                <ServerMultiSelect<AssigneeOption>
                  id="lead-assignee"
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
              <Button type="button" variant="outline" disabled={!permissions.canAssignToSelf || !currentUser || draft.assignee?.id === currentUser.id} onClick={assignToCurrentUser}>
                <UserCheck className="h-4 w-4" />
                Assign to me
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="lead-stage">Stage</Label>
                <Select id="lead-stage" value={draft.stage} disabled={!permissions.canEditStage} onChange={(event) => setDraft((current) => (current ? { ...current, stage: event.target.value as LeadStage } : current))}>
                  {LEAD_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lead-source">Source</Label>
                <Input id="lead-source" value={deal.source} readOnly />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lead-status">Status</Label>
                <Select id="lead-status" value={draft.isActive ? "active" : "inactive"} disabled={!permissions.canEditStatus} onChange={(event) => setDraft((current) => (current ? { ...current, isActive: event.target.value === "active" } : current))}>
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lead-next-task">Next Task</Label>
              <Textarea
                id="lead-next-task"
                value={draft.nextTask}
                readOnly={!permissions.canEditNextTask}
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

      <ConfirmationDialog
        open={Boolean(pendingClosePayload)}
        onOpenChange={(open) => {
          if (!open) setPendingClosePayload(null);
        }}
        title={pendingClosePayload?.stage ? `Move to ${pendingClosePayload.stage}?` : "Move lead card?"}
        description="Closed Won and Closed Lost are final lead stages. After confirming, this card cannot be moved to another stage."
        confirmLabel="Save change"
        isSubmitting={isSaving}
        onConfirm={confirmCloseStageSave}
      />
    </>
  );
}
