import type { LeadSource, LeadStage } from "@/types";

export const LEAD_STAGES: LeadStage[] = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Viewing Scheduled",
  "Viewed",
  "Negotiating",
  "Closed Won",
  "Closed Lost",
  "Dormant",
];

export const LEAD_STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
] as const;

export const CLOSED_LEAD_STAGES = ["Closed Won", "Closed Lost"] as const satisfies readonly LeadStage[];
export const MANUAL_ENTRY_SOURCE: LeadSource = "Manual Entry";
export const LEAD_BOARD_INCLUDES = ["contact", "listing", "user"] as const;
export const LEAD_PAGE_SIZE = 100;

export const LEAD_SOURCES: LeadSource[] = [
  "Manual Entry",
  "Website",
  "Listing Inquiry",
  "Social Media",
  "Referral",
  "Phone Call",
  "Messaging",
  "Email",
  "Paid Ads",
  "Portal",
  "Exhibition",
  "Integration",
];
