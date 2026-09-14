import { Injectable } from '@nestjs/common';
import {
  Tenant as TenantModel,
  User as UserModel,
} from '../prisma/prisma.service.js';
import { User } from './user.type.js';

type TenantRecord = {
  id: string;
  name: string;
  createdAt: string;
};

type MemberSortKey = 'name' | 'email' | 'role' | 'created_at';

export type MemberQueryOptions = {
  tenantId: string;
  search?: string;
  sort: MemberSortKey;
  direction: 'asc' | 'desc';
  page?: number;
  perPage?: number;
};

export type MemberQueryResult = {
  data: User[];
  total: number;
};

@Injectable()
export class UserRepository {
  async findAll(): Promise<User[]> {
    return await UserModel.all();
  }

  async findByTenantId(tenantId: string): Promise<User[]> {
    return await UserModel.where({ tenantId }).all();
  }

  async findById(id: string): Promise<User | null> {
    const user = await UserModel.where({ id }).first();
    return user ? user : null;
  }

  async findTenantById(tenantId: string): Promise<TenantRecord | null> {
    return await TenantModel.where({
      id: tenantId,
    }).first();
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.where({ email }).first();
    return user ? user : null;
  }

  async findMembers(options: MemberQueryOptions): Promise<MemberQueryResult> {
    const users = await this.findByTenantId(options.tenantId);
    const filtered = this.filterMembers(users, options.search);
    const sorted = this.sortMembers(filtered, options.sort, options.direction);

    if (options.page === undefined || options.perPage === undefined) {
      return {
        data: sorted,
        total: sorted.length,
      };
    }

    const start = (options.page - 1) * options.perPage;

    return {
      data: sorted.slice(start, start + options.perPage),
      total: sorted.length,
    };
  }

  private filterMembers(users: User[], search?: string): User[] {
    const needle = search?.trim().toLowerCase();

    if (!needle) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.role]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }

  private sortMembers(
    users: User[],
    sort: MemberSortKey,
    direction: 'asc' | 'desc',
  ): User[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...users].sort((left, right) => {
      const leftValue = String(this.sortValue(left, sort)).toLowerCase();
      const rightValue = String(this.sortValue(right, sort)).toLowerCase();

      return leftValue.localeCompare(rightValue) * multiplier;
    });
  }

  private sortValue(user: User, key: MemberSortKey): string {
    const sortable: Record<MemberSortKey, string> = {
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
    };

    return sortable[key];
  }
}
