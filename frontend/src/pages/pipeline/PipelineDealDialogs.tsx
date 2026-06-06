import { useEffect, useState, type FormEvent } from "react";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ServerMultiSelect, type ServerMultiSelectLoadParams, type ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";
import { Textarea } from "@/components/ui/textarea";
import { createPipelineDeal, updatePipelineDeal } from "@/services/api";
import type { PipelineDeal, PipelineStage, User } from "@/types";
import { MANUAL_ENTRY_SOURCE, PIPELINE_STAGES, PIPELINE_STATUS_OPTIONS } from "./pipelineConstants";
import type { AssigneeOption, ContactOption, ListingOption, PipelineCreatePermissions, PipelineEditPermissions } from "./pipelineTypes";
import {
  changedPipelinePayload,
  contactName,
  contactToOption,
  createPipelineDraft,
  draftFromDeal,
  listingToOption,
  userToOption,
} from "./pipelineUtils";

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

export function PipelineCreateDialog({
  open,
  currentUser,
  permissions,
  onOpenChange,
  onCreated,
  loadContactOptions,
  loadListingOptions,
  loadAssigneeOptions,
}: PipelineCreateDialogProps) {
  const [draft, setDraft] = useState(() => createPipelineDraft(currentUser));
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
            <Button type="button" variant="outline" disabled={!permissions.canAssignToSelf || !currentUser || draft.assignee?.id === currentUser.id} onClick={assignToCurrentUser}>
              <UserCheck className="h-4 w-4" />
              Assign to me
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="new-pipeline-stage">Stage</Label>
              <Select id="new-pipeline-stage" value={draft.stage} onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value as PipelineStage }))}>
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-pipeline-source">Source</Label>
              <Input id="new-pipeline-source" value={MANUAL_ENTRY_SOURCE} readOnly />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-pipeline-status">Status</Label>
              <Select id="new-pipeline-status" value={draft.isActive ? "active" : "inactive"} onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.value === "active" }))}>
                {PIPELINE_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
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

export function PipelineOverviewDialog({
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
  const [draft, setDraft] = useState(() => (deal ? draftFromDeal(deal, members) : null));
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
            <Button type="button" variant="outline" disabled={!permissions.canAssignToSelf || !currentUser || draft.assignee?.id === currentUser.id} onClick={assignToCurrentUser}>
              <UserCheck className="h-4 w-4" />
              Assign to me
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="pipeline-stage">Stage</Label>
              <Select id="pipeline-stage" value={draft.stage} disabled={!permissions.canEditProgress} onChange={(event) => setDraft((current) => (current ? { ...current, stage: event.target.value as PipelineStage } : current))}>
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pipeline-source">Source</Label>
              <Input id="pipeline-source" value={deal.source} readOnly />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pipeline-status">Status</Label>
              <Select id="pipeline-status" value={draft.isActive ? "active" : "inactive"} disabled={!permissions.canEditProgress} onChange={(event) => setDraft((current) => (current ? { ...current, isActive: event.target.value === "active" } : current))}>
                {PIPELINE_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
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
