import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { User } from '../user/user.type.js';

type TenantRecord = {
  id: string;
  name: string;
  createdAt: string;
};

type CreateDemoUserInput = {
  tenantId: string;
  role: string;
  name: string;
  email: string;
  password: string;
};

@Injectable()
export class SeederRepository {
  async findTenantById(id: string): Promise<TenantRecord | null> {
    return db.orm.public.Tenant.where({ id }).first();
  }

  async createTenant(id: string, name: string): Promise<TenantRecord> {
    return db.orm.public.Tenant.create({ id, name });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return db.orm.public.User.where({ email }).first();
  }

  async createUser(input: CreateDemoUserInput): Promise<User> {
    return db.orm.public.User.create({
      tenantId: input.tenantId,
      role: input.role,
      name: input.name,
      email: input.email,
      password: input.password,
      emailVerifiedAt: null,
    });
  }
}
