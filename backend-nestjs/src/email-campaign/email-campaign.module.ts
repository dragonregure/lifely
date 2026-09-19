import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ContactModule } from '../contact/contact.module.js';
import { ListingModule } from '../listing/listing.module.js';
import { queueRuntimeEnabled } from '../queue/queue.config.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UserModule } from '../user/user.module.js';
import { CampaignEmailRenderer } from './campaign-email.renderer.js';
import { MailEmailSender } from './campaign-email.sender.js';
import { EMAILS_QUEUE } from './email-campaign.constants.js';
import { EmailCampaignController } from './email-campaign.controller.js';
import {
  DisabledEmailCampaignQueue,
  EmailCampaignQueue,
} from './email-campaign.queue.js';
import { EmailCampaignRepository } from './email-campaign.repository.js';
import {
  EMAIL_CAMPAIGN_QUEUE,
  EmailCampaignService,
} from './email-campaign.service.js';

const queueEnabled = queueRuntimeEnabled();
const queueImports = queueEnabled
  ? [BullModule.registerQueue({ name: EMAILS_QUEUE })]
  : [];
const queueProviders = queueEnabled
  ? [
      EmailCampaignQueue,
      {
        provide: EMAIL_CAMPAIGN_QUEUE,
        useExisting: EmailCampaignQueue,
      },
    ]
  : [
      DisabledEmailCampaignQueue,
      {
        provide: EMAIL_CAMPAIGN_QUEUE,
        useExisting: DisabledEmailCampaignQueue,
      },
    ];

@Module({
  imports: [
    AuthModule,
    RbacModule,
    ContactModule,
    ListingModule,
    UserModule,
    ...queueImports,
  ],
  controllers: [EmailCampaignController],
  providers: [
    EmailCampaignRepository,
    EmailCampaignService,
    MailEmailSender,
    CampaignEmailRenderer,
    ...queueProviders,
  ],
  exports: [EmailCampaignService],
})
export class EmailCampaignModule {}
