import { useCallback, useMemo, useState, type DragEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus } from "lucide-react";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { LoadingState } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { SearchInput } from "@/components/query/SearchInput";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { LISTING_STATUS } from "@/lib/listingOptions";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import { updateLeadDeal } from "@/services/api";
import type { AppLayoutContext } from "@/components/AppLayout";
import type { LeadDeal, LeadStage } from "@/types";
import { LeadBoard } from "./leads/LeadBoard";
import { LeadAllTable } from "./leads/LeadAllTable";
import { LeadCreateDialog, LeadOverviewDialog } from "./leads/LeadDealDialogs";
import { LeadFiltersMenu } from "./leads/LeadFiltersMenu";
import { MANUAL_ENTRY_SOURCE } from "./leads/leadConstants";
import type { LeadCreatePermissions, LeadEditPermissions, LeadFilters } from "./leads/leadTypes";
import { dealMatchesFilters, emptyLeadFilters, hasLeadDealBlockingProblem, isClosedLeadStage } from "./leads/leadUtils";
import { useLeadDeals } from "./leads/useLeadDeals";
import { useLeadOptions } from "./leads/useLeadOptions";

type PendingStageMove = {
  deal: LeadDeal;
  targetStage: LeadStage;
};

type LeadTab = "pipeline" | "all";

export function LeadsPage() {
  const layoutContext = useOutletContext<AppLayoutContext | null>();
  const isSidebarMinimized = layoutContext?.isSidebarMinimized ?? false;
  const { user, members } = useAuth();
  const { can } = useAuthorization();
  const [selectedDeal, setSelectedDeal] = useState<LeadDeal | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);
  const [movingDealIds, setMovingDealIds] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [pendingStageMove, setPendingStageMove] = useState<PendingStageMove | null>(null);
  const [activeTab, setActiveTab] = useState<LeadTab>("pipeline");
  const [allTableRefreshKey, setAllTableRefreshKey] = useState(0);
  const [filters, setFilters] = useState<LeadFilters>(emptyLeadFilters);
  const { loadAssigneeOptions, loadContactOptions, loadListingOptions, loadSourceOptions } = useLeadOptions();
  const { deals, grouped, isLoading, loadingMoreStage, error, loadMoreStage, reloadDeals, setDeals, setError } = useLeadDeals(filters);

  const canMoveDeal = useCallback(
    (deal: LeadDeal) =>
      can(PERMISSIONS.leads.update) && deal.userId === user?.id && !isClosedLeadStage(deal.stage) && !hasLeadDealBlockingProblem(deal),
    [can, user?.id],
  );

  const selectedDealPermissions = useMemo<LeadEditPermissions | null>(() => {
    if (!selectedDeal) return null;

    const canUpdateLead = can(PERMISSIONS.leads.update);
    const canEditAssignee = can(PERMISSIONS.leads.changeAssignee);
    const canAssignToSelf = can(PERMISSIONS.leads.assignToSelf);
    const isAssignee = selectedDeal.userId === user?.id;
    const hasProblem = hasLeadDealBlockingProblem(selectedDeal);

    return {
      canEditManualFields: canUpdateLead && selectedDeal.source === MANUAL_ENTRY_SOURCE && !hasProblem,
      canEditAssignee: canEditAssignee && !hasProblem,
      canAssignToSelf: canAssignToSelf && !hasProblem,
      canEditStage: canUpdateLead && isAssignee && !isClosedLeadStage(selectedDeal.stage) && !hasProblem,
      canEditStatus: canUpdateLead && isAssignee,
      canEditNextTask: canUpdateLead && isAssignee && !hasProblem,
    };
  }, [can, selectedDeal, user?.id]);

  const createPermissions = useMemo<LeadCreatePermissions>(
    () => ({
      canChangeAssignee: can(PERMISSIONS.leads.changeAssignee),
      canAssignToSelf: can(PERMISSIONS.leads.assignToSelf),
    }),
    [can],
  );

  const handleCreatedDeal = (deal: LeadDeal) => {
    setDeals((current) => (deal.isActive && dealMatchesFilters(deal, filters) ? [deal, ...current] : current));
    setAllTableRefreshKey((current) => current + 1);
  };

  const handleSavedDeal = (deal: LeadDeal) => {
    const savedDeal =
      deal.stage === "Closed Won" && deal.listing ? { ...deal, listing: { ...deal.listing, status: LISTING_STATUS.sold } } : deal;

    setDeals((current) => {
      const syncedDeals = current.map((item) =>
        savedDeal.stage === "Closed Won" && item.listingId === savedDeal.listingId && item.listing
          ? { ...item, listing: { ...item.listing, status: LISTING_STATUS.sold } }
          : item,
      );

      return savedDeal.isActive && dealMatchesFilters(savedDeal, filters)
        ? syncedDeals.map((item) => (item.id === savedDeal.id ? savedDeal : item))
        : syncedDeals.filter((item) => item.id !== savedDeal.id);
    });
    setSelectedDeal(null);
    setAllTableRefreshKey((current) => current + 1);
  };

  const handleCardDragStart = (event: DragEvent<HTMLButtonElement>, deal: LeadDeal) => {
    if (!canMoveDeal(deal)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", deal.id);
    setDraggedDealId(deal.id);
    setError(null);
  };

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, stage: LeadStage) => {
    if (!draggedDealId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleColumnDragLeave = (event: DragEvent<HTMLDivElement>, stage: LeadStage) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragOverStage((current) => (current === stage ? null : current));
    }
  };

  const handleCardDrop = async (event: DragEvent<HTMLDivElement>, targetStage: LeadStage) => {
    event.preventDefault();

    const dealId = event.dataTransfer.getData("text/plain") || draggedDealId;
    setDraggedDealId(null);
    setDragOverStage(null);

    const matchingDeal = deals.find((item) => item.id === dealId);

    if (!matchingDeal || matchingDeal.stage === targetStage) {
      return;
    }

    if (!canMoveDeal(matchingDeal)) {
      setError("This lead card cannot be moved.");
      return;
    }

    if (isClosedLeadStage(targetStage)) {
      setPendingStageMove({ deal: matchingDeal, targetStage });
      return;
    }

    await moveDealToStage(matchingDeal, targetStage);
  };

  const moveDealToStage = async (matchingDeal: LeadDeal, targetStage: LeadStage) => {
    const previousStage = matchingDeal.stage;

    setDeals((current) => {
      const deal = current.find((item) => item.id === matchingDeal.id);

      if (!deal || deal.stage === targetStage || !canMoveDeal(deal)) {
        return current;
      }

      return current.map((item) => (item.id === deal.id ? { ...item, stage: targetStage } : item));
    });
    setMovingDealIds((current) => (current.includes(matchingDeal.id) ? current : [...current, matchingDeal.id]));
    setError(null);

    try {
      const savedDeal = await updateLeadDeal(matchingDeal.id, { stage: targetStage });
      setDeals((current) =>
        current.map((item) => {
          if (item.id === matchingDeal.id) {
            return {
              ...item,
              ...savedDeal,
              contact: item.contact,
              listing: targetStage === "Closed Won" && item.listing ? { ...item.listing, status: LISTING_STATUS.sold } : item.listing,
              user: item.user,
            };
          }

          if (targetStage === "Closed Won" && item.listingId === matchingDeal.listingId && item.listing) {
            return { ...item, listing: { ...item.listing, status: LISTING_STATUS.sold } };
          }

          return item;
        }),
      );
      setAllTableRefreshKey((current) => current + 1);
    } catch (caught) {
      setDeals((current) => current.map((item) => (item.id === matchingDeal.id ? { ...item, stage: previousStage } : item)));
      setError(caught instanceof Error ? caught.message : "Unable to move lead card.");
    } finally {
      setMovingDealIds((current) => current.filter((id) => id !== matchingDeal.id));
    }
  };

  const confirmPendingStageMove = async () => {
    if (!pendingStageMove) return;

    await moveDealToStage(pendingStageMove.deal, pendingStageMove.targetStage);
    setPendingStageMove(null);
  };

  const handleCardDragEnd = () => {
    setDraggedDealId(null);
    setDragOverStage(null);
  };

  const handleTabChange = (value: string) => {
    const nextTab = value as LeadTab;

    setActiveTab((currentTab) => {
      if (currentTab === "all" && nextTab === "pipeline") {
        void reloadDeals();
      }

      return nextTab;
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Leads"
        description="Move deals through the sales process and create the follow-up tasks that keep momentum visible."
        actions={
          <PermissionGate permission={PERMISSIONS.leads.create}>
            <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New deal
            </Button>
          </PermissionGate>
        }
      />

      {error ? <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              id="leads-search"
              label="Search"
              placeholder="Search contact, listing, or assignee"
              value={filters.search}
              onChange={(search) => setFilters((current) => ({ ...current, search }))}
            />
            <div className="flex justify-end">
              <LeadFiltersMenu filters={filters} onChange={setFilters} loadAssigneeOptions={loadAssigneeOptions} loadSourceOptions={loadSourceOptions} />
            </div>
          </div>

          {isLoading ? (
            <LoadingState className="border bg-white" label="Loading leads" />
          ) : (
            <LeadBoard
              columns={grouped}
              draggedDealId={draggedDealId}
              dragOverStage={dragOverStage}
              isSidebarMinimized={isSidebarMinimized}
              loadingMoreStage={loadingMoreStage}
              movingDealIds={movingDealIds}
              canMoveDeal={canMoveDeal}
              onCardClick={setSelectedDeal}
              onCardDragEnd={handleCardDragEnd}
              onCardDragStart={handleCardDragStart}
              onColumnDragLeave={handleColumnDragLeave}
              onColumnDragOver={handleColumnDragOver}
              onDrop={handleCardDrop}
              onLoadMore={loadMoreStage}
            />
          )}
        </TabsContent>

        <TabsContent value="all">
          <LeadAllTable refreshKey={allTableRefreshKey} loadAssigneeOptions={loadAssigneeOptions} onOpenOverview={setSelectedDeal} />
        </TabsContent>
      </Tabs>

      <LeadOverviewDialog
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

      <LeadCreateDialog
        open={isCreateDialogOpen}
        currentUser={user}
        permissions={createPermissions}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={handleCreatedDeal}
        loadContactOptions={loadContactOptions}
        loadListingOptions={loadListingOptions}
        loadAssigneeOptions={loadAssigneeOptions}
      />

      <ConfirmationDialog
        open={Boolean(pendingStageMove)}
        onOpenChange={(open) => {
          if (!open) setPendingStageMove(null);
        }}
        title={pendingStageMove ? `Move to ${pendingStageMove.targetStage}?` : "Move lead card?"}
        description="Closed Won and Closed Lost are final lead stages. After confirming, this card cannot be moved to another stage."
        confirmLabel="Move card"
        isSubmitting={pendingStageMove ? movingDealIds.includes(pendingStageMove.deal.id) : false}
        onConfirm={confirmPendingStageMove}
      />
    </div>
  );
}
