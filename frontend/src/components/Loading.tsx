import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
};

const spinnerSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function LoadingSpinner({ className, label = "Loading", size = "sm" }: LoadingSpinnerProps) {
  return (
    <Loader2
      aria-label={label}
      className={cn("shrink-0 animate-spin text-muted-foreground", spinnerSizes[size], className)}
      role="status"
    />
  );
}

export function LoadingInline({ className, label = "Loading" }: Pick<LoadingSpinnerProps, "className" | "label">) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <LoadingSpinner label={label} />
      {label}
    </span>
  );
}

export function LoadingState({ className, label = "Loading data" }: Pick<LoadingSpinnerProps, "className" | "label">) {
  return (
    <div className={cn("grid min-h-24 place-items-center rounded-md text-sm text-muted-foreground", className)}>
      <LoadingInline label={label} />
    </div>
  );
}
