import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  EMAILS_QUEUE,
  SEND_BULK_EMAIL_CAMPAIGN_JOB,
  SEND_CAMPAIGN_EMAIL_TO_CONTACT_JOB,
} from './email-campaign.constants.js';

@Injectable()
export class EmailCampaignQueue {
  constructor(@InjectQueue(EMAILS_QUEUE) private readonly emailsQueue: Queue) {}

  async enqueueCampaign(campaignId: string): Promise<void> {
    await this.emailsQueue.add(
      SEND_BULK_EMAIL_CAMPAIGN_JOB,
      { campaignId },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async enqueueContact(campaignId: string, contactId: string): Promise<void> {
    await this.emailsQueue.add(
      SEND_CAMPAIGN_EMAIL_TO_CONTACT_JOB,
      { campaignId, contactId },
      { attempts: 3, removeOnComplete: true },
    );
  }
}

@Injectable()
export class DisabledEmailCampaignQueue {
  enqueueCampaign(): Promise<void> {
    return Promise.resolve();
  }

  enqueueContact(): Promise<void> {
    return Promise.resolve();
  }
}
