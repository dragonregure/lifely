import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPipelineDeals } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { PERMISSIONS } from "@/rbac/permissions";
import type { PipelineDeal, PipelineStage } from "@/types";

const stages: PipelineStage[] = ["New lead", "Contacted", "Viewing", "Offer", "Closing"];

export function PipelinePage() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPipelineDeals()
      .then(setDeals)
      .finally(() => setIsLoading(false));
  }, []);

  const grouped = useMemo(() => {
    return stages.map((stage) => ({
      stage,
      deals: deals.filter((deal) => deal.stage === stage),
    }));
  }, [deals]);

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

      {isLoading ? (
        <LoadingState className="border bg-white" label="Loading pipeline" />
      ) : (
      <div className="grid grid-flow-col auto-cols-[12rem] gap-3 overflow-x-auto pb-2 xl:grid-flow-row xl:grid-cols-5">
        {grouped.map((column) => (
          <div key={column.stage} className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold">{column.stage}</h2>
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
                return (
                  <Card key={deal.id} className="shadow-sm">
                    <CardContent className="p-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {contact?.firstName} {contact?.lastName}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{listing?.title ?? "Unassigned listing"}</p>
                      <p className="mt-2 text-sm font-semibold">{formatCurrency(deal.value)}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
