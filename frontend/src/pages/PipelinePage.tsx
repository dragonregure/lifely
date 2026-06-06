import { useCallback, useMemo, useState, type DragEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { SearchInput } from "@/components/query/SearchInput";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import { updatePipelineDeal } from "@/services/api";
import type { AppLayoutContext } from "@/components/AppLayout";
import type { PipelineDeal, PipelineStage } from "@/types";
import { PipelineBoard } from "./pipeline/PipelineBoard";
import { PipelineCreateDialog, PipelineOverviewDialog } from "./pipeline/PipelineDealDialogs";
import { PipelineFiltersMenu } from "./pipeline/PipelineFiltersMenu";
import { MANUAL_ENTRY_SOURCE } from "./pipeline/pipelineConstants";
import type { PipelineCreatePermissions, PipelineEditPermissions, PipelineFilters } from "./pipeline/pipelineTypes";
import { dealMatchesFilters, emptyPipelineFilters } from "./pipeline/pipelineUtils";
import { usePipelineDeals } from "./pipeline/usePipelineDeals";
import { usePipelineOptions } from "./pipeline/usePipelineOptions";

export function PipelinePage() {
  const layoutContext = useOutletContext<AppLayoutContext | null>();
  const isSidebarMinimized = layoutContext?.isSidebarMinimized ?? false;
  const { user, members } = useAuth();
  const { can } = useAuthorization();
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [movingDealIds, setMovingDealIds] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<PipelineFilters>(emptyPipelineFilters);
  const { loadAssigneeOptions, loadContactOptions, loadListingOptions, loadSourceOptions } = usePipelineOptions();
  const { grouped, isLoading, error, setDeals, setError } = usePipelineDeals(filters);

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
    setDraggedDealId(null);
    setDragOverStage(null);

    setDeals((current) => {
      const deal = current.find((item) => item.id === dealId);

      if (!deal || deal.stage === targetStage || !canMoveDeal(deal)) {
        return current;
      }

      return current.map((item) => (item.id === deal.id ? { ...item, stage: targetStage } : item));
    });

    const matchingDeal = grouped.flatMap((column) => column.deals).find((item) => item.id === dealId);

    if (!matchingDeal || matchingDeal.stage === targetStage) {
      return;
    }

    if (!canMoveDeal(matchingDeal)) {
      setError("You do not have permission to move this pipeline card.");
      return;
    }

    const previousStage = matchingDeal.stage;
    setMovingDealIds((current) => (current.includes(matchingDeal.id) ? current : [...current, matchingDeal.id]));
    setError(null);

    try {
      const savedDeal = await updatePipelineDeal(matchingDeal.id, { stage: targetStage });
      setDeals((current) =>
        current.map((item) =>
          item.id === matchingDeal.id
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
      setDeals((current) => current.map((item) => (item.id === matchingDeal.id ? { ...item, stage: previousStage } : item)));
      setError(caught instanceof Error ? caught.message : "Unable to move pipeline card.");
    } finally {
      setMovingDealIds((current) => current.filter((id) => id !== matchingDeal.id));
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
        <SearchInput
          id="pipeline-search"
          label="Search"
          placeholder="Search contact, listing, or assignee"
          value={filters.search}
          onChange={(search) => setFilters((current) => ({ ...current, search }))}
        />
        <div className="flex justify-end">
          <PipelineFiltersMenu filters={filters} onChange={setFilters} loadAssigneeOptions={loadAssigneeOptions} loadSourceOptions={loadSourceOptions} />
        </div>
      </div>

      {isLoading ? (
        <LoadingState className="border bg-white" label="Loading pipeline" />
      ) : (
        <PipelineBoard
          columns={grouped}
          draggedDealId={draggedDealId}
          dragOverStage={dragOverStage}
          isSidebarMinimized={isSidebarMinimized}
          movingDealIds={movingDealIds}
          canMoveDeal={canMoveDeal}
          onCardClick={setSelectedDeal}
          onCardDragEnd={handleCardDragEnd}
          onCardDragStart={handleCardDragStart}
          onColumnDragLeave={handleColumnDragLeave}
          onColumnDragOver={handleColumnDragOver}
          onDrop={handleCardDrop}
        />
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
