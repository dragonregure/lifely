import { Activity, BarChart3, Building2, ContactRound, LayoutDashboard, Mail, Settings, UsersRound, type LucideIcon } from "lucide-react";
import { PERMISSIONS, SETTINGS_PERMISSIONS, type PermissionName } from "./permissions";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  anyOf?: readonly PermissionName[];
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contacts", href: "/contacts", icon: ContactRound, anyOf: [PERMISSIONS.contacts.view] },
  { label: "Pipeline", href: "/pipeline", icon: BarChart3, anyOf: [PERMISSIONS.pipeline.view] },
  { label: "Listings", href: "/listings", icon: Building2, anyOf: [PERMISSIONS.listings.view] },
  { label: "Bulk Email", href: "/email", icon: Mail, anyOf: [PERMISSIONS.emailCampaigns.view] },
  { label: "Activity", href: "/activity", icon: Activity, anyOf: [PERMISSIONS.activityLogs.view] },
  { label: "Reports", href: "/reports", icon: UsersRound, anyOf: [PERMISSIONS.reports.view] },
  { label: "Settings", href: "/settings", icon: Settings, anyOf: SETTINGS_PERMISSIONS },
];

export const ROUTE_PERMISSIONS: Record<string, readonly PermissionName[] | undefined> = {
  "/dashboard": undefined,
  "/contacts": [PERMISSIONS.contacts.view],
  "/pipeline": [PERMISSIONS.pipeline.view],
  "/listings": [PERMISSIONS.listings.view],
  "/email": [PERMISSIONS.emailCampaigns.view],
  "/activity": [PERMISSIONS.activityLogs.view],
  "/reports": [PERMISSIONS.reports.view],
  "/settings": SETTINGS_PERMISSIONS,
};
