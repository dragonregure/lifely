import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type DangerTriangleIconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function DangerTriangleIcon({ className, title = "Warning", ...props }: DangerTriangleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={cn("h-4 w-4 text-destructive", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>{title}</title>
      <path d="M12 3.5 21 20H3L12 3.5Z" fill="currentColor" />
      <path d="M12 9v5" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17.25h.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
