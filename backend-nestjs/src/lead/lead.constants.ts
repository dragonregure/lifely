export const LeadStages = {
  NEW_LEAD: 0,
  CONTACTED: 1,
  QUALIFIED: 2,
  VIEWING_SCHEDULED: 3,
  VIEWED: 4,
  NEGOTIATING: 5,
  CLOSED_WON: 6,
  CLOSED_LOST: 7,
  DORMANT: 8,
} as const;

export const LeadSources = {
  MANUAL_ENTRY: 0,
  WEBSITE: 1,
  LISTING_INQUIRY: 2,
  SOCIAL_MEDIA: 3,
  REFERRAL: 4,
  PHONE_CALL: 5,
  MESSAGING: 6,
  EMAIL: 7,
  PAID_ADS: 8,
  PORTAL: 9,
  EXHIBITION: 10,
  INTEGRATION: 11,
} as const;

export const LEAD_STAGE_LABELS = {
  [LeadStages.NEW_LEAD]: 'New Lead',
  [LeadStages.CONTACTED]: 'Contacted',
  [LeadStages.QUALIFIED]: 'Qualified',
  [LeadStages.VIEWING_SCHEDULED]: 'Viewing Scheduled',
  [LeadStages.VIEWED]: 'Viewed',
  [LeadStages.NEGOTIATING]: 'Negotiating',
  [LeadStages.CLOSED_WON]: 'Closed Won',
  [LeadStages.CLOSED_LOST]: 'Closed Lost',
  [LeadStages.DORMANT]: 'Dormant',
} as const;

export const LEAD_SOURCE_LABELS = {
  [LeadSources.MANUAL_ENTRY]: 'Manual Entry',
  [LeadSources.WEBSITE]: 'Website',
  [LeadSources.LISTING_INQUIRY]: 'Listing Inquiry',
  [LeadSources.SOCIAL_MEDIA]: 'Social Media',
  [LeadSources.REFERRAL]: 'Referral',
  [LeadSources.PHONE_CALL]: 'Phone Call',
  [LeadSources.MESSAGING]: 'Messaging',
  [LeadSources.EMAIL]: 'Email',
  [LeadSources.PAID_ADS]: 'Paid Ads',
  [LeadSources.PORTAL]: 'Portal',
  [LeadSources.EXHIBITION]: 'Exhibition',
  [LeadSources.INTEGRATION]: 'Integration',
} as const;

const LEGACY_STAGE_LABELS: Record<string, number> = {
  'new lead': LeadStages.NEW_LEAD,
  viewing: LeadStages.VIEWING_SCHEDULED,
  'viewing: scheduled': LeadStages.VIEWING_SCHEDULED,
  offer: LeadStages.NEGOTIATING,
  closing: LeadStages.CLOSED_WON,
  closed: LeadStages.CLOSED_WON,
  'closed: won': LeadStages.CLOSED_WON,
  'closed: lost': LeadStages.CLOSED_LOST,
};

export const leadStageValues = (): number[] =>
  Object.keys(LEAD_STAGE_LABELS).map(Number);

export const leadSourceValues = (): number[] =>
  Object.keys(LEAD_SOURCE_LABELS).map(Number);

export function leadStageLabel(stage: number): string {
  return (
    LEAD_STAGE_LABELS[stage as keyof typeof LEAD_STAGE_LABELS] ??
    LEAD_STAGE_LABELS[LeadStages.NEW_LEAD]
  );
}

export function leadSourceLabel(source: number): string {
  return (
    LEAD_SOURCE_LABELS[source as keyof typeof LEAD_SOURCE_LABELS] ??
    LEAD_SOURCE_LABELS[LeadSources.MANUAL_ENTRY]
  );
}

export function leadStageFromInput(stage: unknown): number | null {
  return numericOrLabelValue(stage, LEAD_STAGE_LABELS, LEGACY_STAGE_LABELS);
}

export function leadSourceFromInput(source: unknown): number | null {
  return numericOrLabelValue(source, LEAD_SOURCE_LABELS);
}

export function isClosedLeadStage(stage: number): boolean {
  return stage === LeadStages.CLOSED_WON || stage === LeadStages.CLOSED_LOST;
}

function numericOrLabelValue(
  value: unknown,
  labels: Record<number, string>,
  legacyLabels: Record<string, number> = {},
): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value in labels ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');

  if (normalized === '') {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    const numericValue = Number.parseInt(normalized, 10);

    return numericValue in labels ? numericValue : null;
  }

  const match = Object.entries(labels).find(
    ([, label]) => label.toLowerCase() === normalized,
  );

  return match
    ? Number.parseInt(match[0], 10)
    : (legacyLabels[normalized] ?? null);
}
