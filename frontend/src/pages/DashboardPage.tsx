import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Clock3, DollarSign, UsersRound } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getActivityLogs, getContacts, getDashboardSummary, getListings, getPipelineDeals } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { PERMISSIONS } from "@/rbac/permissions";
import type { ActivityLog, Contact, DashboardSummary, Listing, PipelineDeal } from "@/types";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      const dashboard = await getDashboardSummary().catch(() => null);

      if (isMounted && dashboard) {
        setSummary(dashboard);
      }

      const pipeline = await getPipelineDeals().catch(() => []);
      if (isMounted) setDeals(pipeline);

      const activity = await getActivityLogs().catch(() => []);
      if (isMounted) setLogs(activity);

      const contactData = await getContacts().catch(() => []);
      if (isMounted) setContacts(contactData);

      const listingData = await getListings().catch(() => []);
      if (isMounted) setListings(listingData);

      if (isMounted) setIsLoading(false);
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const topDeals = deals.slice(0, 4);

  return (
    <div>
      <PageHeader
        eyebrow="Today"
        title="Dashboard"
        description="A focused view of lead intake, pending sales work, and office activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PermissionGate permission={PERMISSIONS.contacts.view}>
          <MetricCard label="New leads" value={`${summary?.newLeads ?? 0}`} note="Fresh contacts this week" icon={UsersRound} isLoading={isLoading} />
        </PermissionGate>
        <PermissionGate permission={PERMISSIONS.pipeline.view}>
          <MetricCard label="Pending tasks" value={`${summary?.pendingTasks ?? 0}`} note="Due across active deals" icon={Clock3} isLoading={isLoading} />
          <MetricCard
            label="Pipeline value"
            value={formatCurrency(summary?.pipelineValue ?? 0)}
            note="Weighted active opportunities"
            icon={DollarSign}
            isLoading={isLoading}
          />
        </PermissionGate>
        <PermissionGate permission={PERMISSIONS.reports.view}>
          <MetricCard label="Win rate" value={`${summary?.winRate ?? 0}%`} note="Rolling 90-day close rate" icon={CheckCircle2} isLoading={isLoading} />
        </PermissionGate>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <PermissionGate anyOf={[PERMISSIONS.pipeline.view, PERMISSIONS.reports.view]}>
          <Card>
            <CardHeader>
              <CardTitle>Pipeline performance</CardTitle>
              <CardDescription>Monthly closed and forecasted deal value.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {isLoading ? (
                  <LoadingState className="h-full" label="Loading chart" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary?.pipelinePerformance ?? []} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pipelineFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Area type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={2} fill="url(#pipelineFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </PermissionGate>

        <PermissionGate permission={PERMISSIONS.contacts.view}>
          <Card>
            <CardHeader>
              <CardTitle>Lead health</CardTitle>
              <CardDescription>Status distribution for active contacts.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {isLoading ? <LoadingState label="Loading lead health" /> : (summary?.leadHealth ?? []).map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.value}</span>
                  </div>
                  <Progress value={(item.value / 24) * 100} />
                </div>
              ))}
            </CardContent>
          </Card>
        </PermissionGate>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <PermissionGate permission={PERMISSIONS.pipeline.view}>
          <Card>
            <CardHeader>
              <CardTitle>Priority deals</CardTitle>
              <CardDescription>Deals with near-term tasks and high office impact.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isLoading ? <LoadingState label="Loading deals" /> : topDeals.map((deal) => {
                const contact = deal.contact ?? contacts.find((item) => item.id === deal.contactId);
                const listing = deal.listing ?? listings.find((item) => item.id === deal.listingId);
                return (
                  <div key={deal.id} className="rounded-lg border bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {contact?.firstName} {contact?.lastName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{listing?.title}</p>
                      </div>
                      <StatusBadge status={contact?.status ?? "New"} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{deal.nextTask}</span>
                      <span className="font-semibold">{formatCurrency(deal.value)}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </PermissionGate>

        <PermissionGate permission={PERMISSIONS.activityLogs.view}>
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Audit trail highlights from the office workspace.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isLoading ? <LoadingState label="Loading activity" /> : logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex gap-3 rounded-lg border bg-white p-3">
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="text-sm">{log.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </PermissionGate>
      </div>
    </div>
  );
}
