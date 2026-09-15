import { Injectable } from '@nestjs/common';
import type { JsonValue } from '@prisma/orm-postgres/target/codec-types';
import {
  ActivityLog as ActivityLogModel,
  User as UserModel,
} from '../prisma/prisma.service.js';
import { ActivityLog, ActivityProperties } from './activity.type.js';

export type ActivitySortKey =
  'action' | 'description' | 'user' | 'time' | 'created_at';

export type ActivityQueryOptions = {
  tenantId: string;
  search?: string;
  actionType?: string;
  userId?: string;
  sort: ActivitySortKey;
  direction: 'asc' | 'desc';
  page: number;
  perPage: number;
};

export type ActivityQueryResult = {
  data: ActivityLog[];
  total: number;
};

export type ActivityRecordInput = {
  tenantId: string;
  userId: string | null;
  actionType: string;
  description: string;
  properties?: ActivityProperties;
};

@Injectable()
export class ActivityRepository {
  async find(options: ActivityQueryOptions): Promise<ActivityQueryResult> {
    const [activityLogs, users] = await Promise.all([
      ActivityLogModel.where({ tenantId: options.tenantId }).all(),
      UserModel.where({ tenantId: options.tenantId }).all(),
    ]);
    const userNameById = new Map(users.map((user) => [user.id, user.name]));
    const withUsers = activityLogs.map((activityLog) => ({
      ...activityLog,
      properties: this.activityProperties(activityLog.properties),
      userName:
        activityLog.userId === null
          ? null
          : (userNameById.get(activityLog.userId) ?? null),
    }));
    const filtered = this.filterActivityLogs(withUsers, options);
    const sorted = this.sortActivityLogs(
      filtered,
      options.sort,
      options.direction,
    );
    const start = (options.page - 1) * options.perPage;

    return {
      data: sorted.slice(start, start + options.perPage),
      total: sorted.length,
    };
  }

  async record(data: ActivityRecordInput): Promise<ActivityLog> {
    const properties =
      data.properties && Object.keys(data.properties).length > 0
        ? data.properties
        : null;
    const activityLog = await ActivityLogModel.create({
      tenantId: data.tenantId,
      userId: data.userId,
      actionType: data.actionType,
      description: data.description,
      ...(properties === null
        ? {}
        : { properties: properties as unknown as JsonValue }),
    });

    return {
      ...activityLog,
      properties: this.activityProperties(activityLog.properties),
      userName: null,
    };
  }

  private filterActivityLogs(
    activityLogs: ActivityLog[],
    options: ActivityQueryOptions,
  ): ActivityLog[] {
    const needle = options.search?.trim().toLowerCase();
    const actionTypes = this.commaSeparated(options.actionType);
    const userIds = this.commaSeparated(options.userId);

    return activityLogs.filter((activityLog) => {
      const matchesSearch =
        !needle ||
        [
          activityLog.actionType,
          activityLog.description,
          activityLog.userId,
          activityLog.userName,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesActionType =
        actionTypes.length === 0 ||
        actionTypes.includes(activityLog.actionType);
      const matchesUser =
        userIds.length === 0 ||
        (activityLog.userId !== null && userIds.includes(activityLog.userId));

      return matchesSearch && matchesActionType && matchesUser;
    });
  }

  private sortActivityLogs(
    activityLogs: ActivityLog[],
    sort: ActivitySortKey,
    direction: 'asc' | 'desc',
  ): ActivityLog[] {
    const multiplier = direction === 'desc' ? -1 : 1;

    return [...activityLogs].sort((left, right) => {
      const primary = String(this.sortValue(left, sort) ?? '')
        .toLowerCase()
        .localeCompare(String(this.sortValue(right, sort) ?? '').toLowerCase());

      if (primary !== 0) {
        return primary * multiplier;
      }

      return (
        left.createdAt.localeCompare(right.createdAt) * multiplier ||
        left.id.localeCompare(right.id) * multiplier
      );
    });
  }

  private sortValue(activityLog: ActivityLog, key: ActivitySortKey): string {
    const sortable: Record<ActivitySortKey, string | null> = {
      action: activityLog.actionType,
      description: activityLog.description,
      user: activityLog.userId,
      time: activityLog.createdAt,
      created_at: activityLog.createdAt,
    };

    return sortable[key] ?? '';
  }

  private activityProperties(value: unknown): ActivityProperties | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as ActivityProperties)
      : null;
  }

  private commaSeparated(value?: string): string[] {
    if (!value) {
      return [];
    }

    return [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }
}
