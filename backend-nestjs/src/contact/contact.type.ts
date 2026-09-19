export type Contact = {
  id: string;
  tenantId: string;
  ownerId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: boolean;
  budget: string | number | null;
  source: number | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
