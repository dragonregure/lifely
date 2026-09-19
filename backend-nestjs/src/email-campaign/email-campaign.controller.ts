import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePermissions } from '../rbac/permissions.decorator.js';
import { Permissions } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import {
  EmailCampaignEnvelopeDto,
  PaginatedEmailCampaignListEnvelopeDto,
  SendBulkEmailDto,
} from './email-campaign.dto.js';
import { EmailCampaignService } from './email-campaign.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type QueryParams = Record<string, string | string[] | undefined>;

@ApiBearerAuth()
@ApiTags('Email Campaigns')
@Controller('api/v1')
@UseGuards(AuthGuard, RbacGuard)
export class EmailCampaignController {
  constructor(private readonly emailCampaignService: EmailCampaignService) {}

  @Get('email-campaigns')
  @RequirePermissions(Permissions.EMAIL_CAMPAIGNS_VIEW)
  @ApiOperation({
    summary: 'List email campaigns',
    description:
      'Requires `email_campaigns.view`. Supports server-side pagination, search, filters, and sorting.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'per_page', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['subject', 'recipient_count', 'status', 'created_at'],
  })
  @ApiQuery({ name: 'direction', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'filter[status]', required: false, type: String })
  @ApiQuery({ name: 'filter[user_id]', required: false, type: String })
  @ApiOkResponse({ type: PaginatedEmailCampaignListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async index(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<PaginatedEmailCampaignListEnvelopeDto> {
    return this.emailCampaignService.findCampaigns(
      this.tenantId(request),
      query,
      this.requestUrl(request),
    );
  }

  @Post('bulk-emails')
  @RequirePermissions(Permissions.EMAIL_CAMPAIGNS_CREATE)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue bulk email',
    description: 'Requires `email_campaigns.create`.',
  })
  @ApiAcceptedResponse({ type: EmailCampaignEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async store(
    @Req() request: RequestWithUser,
    @Body() dto: SendBulkEmailDto,
  ): Promise<EmailCampaignEnvelopeDto> {
    return {
      data: await this.emailCampaignService.queueBulkEmail(
        this.tenantId(request),
        dto,
      ),
    };
  }

  private tenantId(request: RequestWithUser): string {
    const requestedTenantId =
      this.scalar(request.header('X-Tenant-Id')) ??
      this.scalar(request.query.tenant_id) ??
      request.user.tenant_id;

    if (requestedTenantId !== request.user.tenant_id) {
      throw new ForbiddenException(
        'Tenant context does not match the authenticated user.',
      );
    }

    return requestedTenantId;
  }

  private scalar(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return this.scalar(value[0]);
    }

    return typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : undefined;
  }

  private requestUrl(request: RequestWithUser): string {
    return `${request.protocol}://${request.get('host')}${request.path}`;
  }
}
