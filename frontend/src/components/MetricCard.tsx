import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, note, icon: Icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-sky-50 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
