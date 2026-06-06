import type { ContactSource } from "@/types";

export const CONTACT_STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
] as const;

export const CONTACT_SOURCE_OPTIONS: Array<{ label: ContactSource; value: string; description: string }> = [
  { label: "Manual Entry", value: "0", description: "Agent manually creates lead" },
  { label: "Website", value: "1", description: "Contact form, inquiry form" },
  { label: "Listing Inquiry", value: "2", description: "User contacts seller from a specific listing" },
  { label: "Social Media", value: "3", description: "Facebook, Instagram, TikTok, LinkedIn" },
  { label: "Referral", value: "4", description: "Existing customer, partner, friend" },
  { label: "Phone Call", value: "5", description: "Inbound call" },
  { label: "Messaging", value: "6", description: "WhatsApp, Telegram, Messenger" },
  { label: "Email", value: "7", description: "Email inquiry" },
  { label: "Paid Ads", value: "8", description: "Google Ads, Facebook Ads" },
  { label: "Portal", value: "9", description: "Property portal, car marketplace, etc." },
  { label: "Exhibition", value: "10", description: "Property expo, trade show" },
  { label: "Integration", value: "11", description: "Imported from another system" },
  { label: "Walk-in", value: "12", description: "Visitor comes to the office/showroom" },
  { label: "Open House", value: "13", description: "Lead collected during an event" },
  { label: "Developer Partner", value: "14", description: "Lead provided by a property developer" },
  { label: "Bulk Import", value: "15", description: "Uploaded via CSV/Excel" },
];

export const DEFAULT_CONTACT_SOURCE_ID = CONTACT_SOURCE_OPTIONS[0].value;
