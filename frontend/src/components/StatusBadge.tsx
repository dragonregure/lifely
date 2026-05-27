import { Badge } from "@/components/ui/badge";
import type { ContactStatus, ListingStatus } from "@/types";

type StatusBadgeProps = {
  status: ContactStatus | ListingStatus | "Queued" | "Sent" | "Draft";
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === "Closed" || status === "Sold" || status === "Sent"
      ? "success"
      : status === "Negotiating" || status === "Under Contract" || status === "Queued"
        ? "warning"
        : status === "New" || status === "Available" || status === "Draft"
          ? "info"
          : status === "Dormant"
            ? "muted"
            : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}
