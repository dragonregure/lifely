import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

export type AuthUserRecord = {
  id: string;
  tenantId: string;
  role: string;
  name: string;
  email: string;
  password: string;
  tenant?: {
    id: string;
    name: string;
    createdAt: string;
  };
};

type CreateTenantOwnerInput = {
  tenantName: string;
  role: string;
  name: string;
  email: string;
  password: string;
};

@Injectable()
export class AuthRepository {
  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return (await db.orm.public.User.where({ email })
      .include('tenant')
      .first()) as AuthUserRecord | null;
  }

  async findUserById(id: string): Promise<AuthUserRecord | null> {
    return (await db.orm.public.User.where({ id })
      .include('tenant')
      .first()) as AuthUserRecord | null;
  }

  async createTenantOwner(
    input: CreateTenantOwnerInput,
  ): Promise<AuthUserRecord> {
    return db.transaction(async (tx) => {
      const tenant = await tx.orm.public.Tenant.create({
        name: input.tenantName,
      });
      const user = await tx.orm.public.User.create({
        tenantId: tenant.id,
        role: input.role,
        name: input.name,
        email: input.email,
        password: input.password,
        emailVerifiedAt: null,
      });

      return { ...user, tenant };
    });
  }

  async updateUserPassword(userId: string, password: string): Promise<void> {
    await db.orm.public.User.where({ id: userId }).update({ password });
  }
}
