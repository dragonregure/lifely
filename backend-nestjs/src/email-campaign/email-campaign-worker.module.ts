import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EMAILS_QUEUE } from './email-campaign.constants.js';
import { EmailCampaignModule } from './email-campaign.module.js';
import { EmailCampaignProcessor } from './email-campaign.processor.js';

@Module({
  imports: [
    EmailCampaignModule,
    BullModule.registerQueue({ name: EMAILS_QUEUE }),
  ],
  providers: [EmailCampaignProcessor],
})
export class EmailCampaignWorkerModule {}
