import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
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
  LeadEnvelopeDto,
  PaginatedLeadListEnvelopeDto,
  StoreLeadDto,
  UpdateLeadDto,
  UpdateLeadStageDto,
} from './lead.dto.js';
import { LeadService } from './lead.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type QueryParams = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

@ApiBearerAuth()
@ApiTags('Leads')
@Controller('api/v1/leads')
@UseGuards(AuthGuard, RbacGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  @RequirePermissions(Permissions.LEADS_VIEW)
  @ApiOperation({
    summary: 'List leads',
    description:
      'Requires `leads.view`. Supports server-side pagination, search, filters, sorting, and whitelisted relation includes.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'per_page', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'include[]',
    required: false,
    enum: ['contact', 'listing', 'user'],
    isArray: true,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['stage', 'source', 'value', 'next_task', 'due_at', 'created_at'],
  })
  @ApiQuery({ name: 'direction', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'filter[stage]', required: false, type: String })
  @ApiQuery({ name: 'filter[source]', required: false, type: String })
  @ApiQuery({ name: 'filter[user_id]', required: false, type: String })
  @ApiQuery({ name: 'filter[contact_id]', required: false, type: String })
  @ApiQuery({ name: 'filter[listing_id]', required: false, type: String })
  @ApiQuery({ name: 'filter[is_active]', required: false, type: String })
  @ApiOkResponse({ type: PaginatedLeadListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async index(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<PaginatedLeadListEnvelopeDto> {
    return this.leadService.findLeads(
      this.tenantId(request),
      query,
      this.requestUrl(request),
    );
  }

  @Post()
  @RequirePermissions(Permissions.LEADS_CREATE)
  @ApiOperation({
    summary: 'Create lead',
    description:
      'Requires `leads.create`. Assignee selection requires `leads.change_assignee`; assigning the current user also allows `leads.assign_to_self`.',
  })
  @ApiCreatedResponse({ type: LeadEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async store(
    @Req() request: RequestWithUser,
    @Body() dto: StoreLeadDto,
  ): Promise<LeadEnvelopeDto> {
    return {
      data: await this.leadService.createLead(
        this.tenantId(request),
        request.user,
        dto,
      ),
    };
  }

  @Patch(':lead')
  @ApiOperation({
    summary: 'Update lead overview',
    description:
      'Updates overview fields. Assignee changes require `leads.change_assignee`, or `leads.assign_to_self` when assigning the current user. Progress fields require `leads.update` and the current user must be the assignee.',
  })
  @ApiOkResponse({ type: LeadEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Lead is outside current tenant scope or not found.',
  })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async update(
    @Req() request: RequestWithUser,
    @Param('lead') lead: string,
    @Body() dto: UpdateLeadDto,
  ): Promise<LeadEnvelopeDto> {
    return {
      data: await this.leadService.updateLead(
        this.tenantId(request),
        request.user,
        lead,
        dto,
      ),
    };
  }

  @Patch(':lead/stage')
  @RequirePermissions(Permissions.LEADS_UPDATE)
  @ApiOperation({
    summary: 'Move lead to a new stage',
    description:
      'Requires `leads.update`, and the authenticated user must be the assigned user unless system bypass applies. Closed Won and Closed Lost are final stages. Moving to Closed Won marks the related listing Sold.',
  })
  @ApiOkResponse({ type: LeadEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Lead is outside current tenant scope or not found.',
  })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async updateStage(
    @Req() request: RequestWithUser,
    @Param('lead') lead: string,
    @Body() dto: UpdateLeadStageDto,
  ): Promise<LeadEnvelopeDto> {
    return {
      data: await this.leadService.updateLeadStage(
        this.tenantId(request),
        request.user,
        lead,
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
