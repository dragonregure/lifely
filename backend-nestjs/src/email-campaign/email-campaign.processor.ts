import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  EMAILS_QUEUE,
  SEND_BULK_EMAIL_CAMPAIGN_JOB,
  SEND_CAMPAIGN_EMAIL_TO_CONTACT_JOB,
} from './email-campaign.constants.js';
import { EmailCampaignService } from './email-campaign.service.js';

type BulkCampaignJobData = {
  campaignId?: string;
};

type ContactCampaignJobData = BulkCampaignJobData & {
  contactId?: string;
};

@Injectable()
@Processor(EMAILS_QUEUE, { concurrency: 1 })
export class EmailCampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailCampaignProcessor.name);

  constructor(private readonly emailCampaignService: EmailCampaignService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === SEND_BULK_EMAIL_CAMPAIGN_JOB) {
      const data = job.data as BulkCampaignJobData;

      if (!data.campaignId) {
        return;
      }

      this.logger.log(`Processing ${SEND_BULK_EMAIL_CAMPAIGN_JOB}.`);
      await this.emailCampaignService.processCampaign(data.campaignId);
      return;
    }

    if (job.name === SEND_CAMPAIGN_EMAIL_TO_CONTACT_JOB) {
      const data = job.data as ContactCampaignJobData;

      if (!data.campaignId || !data.contactId) {
        return;
      }

      await this.emailCampaignService.processCampaignContact(
        data.campaignId,
        data.contactId,
      );
    }
  }
}
