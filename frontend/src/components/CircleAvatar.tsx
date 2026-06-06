import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CircleAvatarSize = "xs" | "sm" | "md" | "lg";

type CircleAvatarProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  name: string;
  initials?: string | null;
  src?: string | null;
  size?: CircleAvatarSize | number;
};

const sizeStyles: Record<CircleAvatarSize, { dimension: string; fontSize: string }> = {
  xs: { dimension: "1.5rem", fontSize: "0.625rem" },
  sm: { dimension: "1.75rem", fontSize: "0.6875rem" },
  md: { dimension: "2.25rem", fontSize: "0.8125rem" },
  lg: { dimension: "2.75rem", fontSize: "1rem" },
};

function avatarInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  const firstInitial = words[0]?.[0] ?? "";
  const secondInitial = words.length > 1 ? words[words.length - 1]?.[0] ?? "" : words[0]?.[1] ?? "";

  return `${firstInitial}${secondInitial}`.toUpperCase();
}

export function CircleAvatar({ name, initials, src, size = "md", className, style, ...props }: CircleAvatarProps) {
  const fallbackInitials = (initials?.trim() || avatarInitials(name)).slice(0, 2).toUpperCase();
  const dimension = typeof size === "number" ? `${size}px` : sizeStyles[size].dimension;
  const fontSize = typeof size === "number" ? `${Math.max(10, Math.round(size * 0.38))}px` : sizeStyles[size].fontSize;
  const avatarStyle: CSSProperties = {
    width: dimension,
    height: dimension,
    fontSize,
    ...style,
  };

  return (
    <span
      role="img"
      aria-label={props["aria-label"] ?? name}
      title={props.title ?? name}
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-primary/20 bg-primary/10 font-semibold leading-none text-primary",
        className,
      )}
      style={avatarStyle}
      {...props}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : fallbackInitials}
    </span>
  );
}
