import { Badge } from "@/components/ui/badge";
type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === "Closed" || status === "Sold" || status === "Sent"
      ? "success"
      : status === "Negotiating" || status === "Under Contract" || status === "Queued"
        ? "warning"
        : status === "New" || status === "Available" || status === "Draft" || status === "Active"
          ? "info"
          : status === "Dormant" || status === "Inactive"
            ? "muted"
            : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}
