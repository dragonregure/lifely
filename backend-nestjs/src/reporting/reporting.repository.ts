import { Injectable } from '@nestjs/common';
import {
  ActivityLog as ActivityLogModel,
  Contact as ContactModel,
  Lead as LeadModel,
  Listing as ListingModel,
  User as UserModel,
} from '../prisma/prisma.service.js';
import { ActivityProperties } from '../activity/activity.type.js';
import { ReportingSnapshot } from './reporting.type.js';

@Injectable()
export class ReportingRepository {
  async snapshot(tenantId: string): Promise<ReportingSnapshot> {
    const [contacts, leads, listings, users, activityLogs] = await Promise.all([
      ContactModel.where({ tenantId }).all(),
      LeadModel.where({ tenantId }).all(),
      ListingModel.where({ tenantId }).all(),
      UserModel.where({ tenantId }).all(),
      ActivityLogModel.where({ tenantId }).all(),
    ]);

    return {
      contacts,
      leads,
      listings,
      users,
      activityLogs: activityLogs.map((activityLog) => ({
        ...activityLog,
        properties: this.activityProperties(activityLog.properties),
        userName: null,
      })),
    };
  }

  private activityProperties(value: unknown): ActivityProperties | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as ActivityProperties)
      : null;
  }
}
