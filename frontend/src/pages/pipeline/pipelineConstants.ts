import type { PipelineSource, PipelineStage } from "@/types";

export const PIPELINE_STAGES: PipelineStage[] = [
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

export const PIPELINE_STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
] as const;

export const CLOSED_PIPELINE_STAGES = ["Closed Won", "Closed Lost"] as const satisfies readonly PipelineStage[];
export const MANUAL_ENTRY_SOURCE: PipelineSource = "Manual Entry";
export const PIPELINE_BOARD_INCLUDES = ["contact", "listing", "user"] as const;
export const PIPELINE_PAGE_SIZE = 100;

export const PIPELINE_SOURCES: PipelineSource[] = [
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
