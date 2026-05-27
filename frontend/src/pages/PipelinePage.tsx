import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPipelineDeals } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { PipelineDeal, PipelineStage } from "@/types";

const stages: PipelineStage[] = ["New lead", "Contacted", "Viewing", "Offer", "Closing"];

export function PipelinePage() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);

  useEffect(() => {
    getPipelineDeals().then(setDeals);
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
                <Button type="button">
                  <CalendarPlus className="h-4 w-4" />
                  Create dummy task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-5">
        {grouped.map((column) => (
          <div key={column.stage} className="min-w-72">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{column.stage}</h2>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-muted-foreground">{column.deals.length}</span>
            </div>
            <div className="grid gap-3">
              {column.deals.map((deal) => {
                const contact = deal.contact;
                const listing = deal.listing;
                return (
                  <Card key={deal.id}>
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm">
                          {contact?.firstName} {contact?.lastName}
                        </CardTitle>
                        <StatusBadge status={contact?.status ?? "New"} />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm text-muted-foreground">{listing?.title}</p>
                      <p className="mt-3 text-lg font-semibold">{formatCurrency(deal.value)}</p>
                      <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">{deal.nextTask}</p>
                        <p className="mt-1">Owner ID: {deal.userId}</p>
                        <p>Due: {deal.dueAt ? new Date(deal.dueAt).toLocaleDateString() : "Unscheduled"}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
