export type ActivityProperties = Record<string, unknown>;

export type ActivityLog = {
  id: string;
  tenantId: string;
  userId: string | null;
  userName?: string | null;
  actionType: string;
  description: string;
  properties: ActivityProperties | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivitySubject = {
  id: string;
  tenantId: string;
};

export type ActivityChange = {
  old: unknown;
  new: unknown;
};
