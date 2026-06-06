import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, Target, TrendingUp, UsersRound } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

const colors = ["#0EA5E9", "#10B981", "#F59E0B", "#6366F1", "#14B8A6", "#94A3B8"];

export function ReportsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="A concise reporting surface for lead performance, lead mix, and office health."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Forecast" value={formatCurrency(summary?.leadValue ?? 0)} note="Open lead value" icon={DollarSign} isLoading={isLoading} />
        <MetricCard label="Lead intake" value={`${summary?.newLeads ?? 0}`} note="New leads this week" icon={UsersRound} isLoading={isLoading} />
        <MetricCard label="Conversion" value={`${summary?.winRate ?? 0}%`} note="Rolling close rate" icon={Target} isLoading={isLoading} />
        <MetricCard label="Velocity" value="18 days" note="Average stage duration" icon={TrendingUp} isLoading={isLoading} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly leads</CardTitle>
            <CardDescription>Deal value trend by month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
                <LoadingState className="h-full" label="Loading chart" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.leadPerformance ?? []} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="value" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead distribution</CardTitle>
            <CardDescription>Current contact status mix.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
                <LoadingState className="h-full" label="Loading chart" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary?.leadHealth ?? []} dataKey="value" nameKey="label" innerRadius={64} outerRadius={105} paddingAngle={3}>
                      {(summary?.leadHealth ?? []).map((entry, index) => (
                        <Cell key={entry.label} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(summary?.leadHealth ?? []).map((item, index) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                  <span className="flex-1 text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
