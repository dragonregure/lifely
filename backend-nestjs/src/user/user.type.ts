export type User = {
  id: string;
  tenantId: string;
  role: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = {
  id: string;
  tenant_id: string;
  role: string;
  name: string;
  email: string;
  created_at: string;
};
