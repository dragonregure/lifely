import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiNoContentResponse,
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
import type { AuthenticatedUser } from '../rbac/rbac.types.js';
import {
  PaginatedReferenceListEnvelopeDto,
  ReferenceEnvelopeDto,
  ReferenceOptionListEnvelopeDto,
  StoreReferenceDto,
  UpdateReferenceDto,
} from './reference.dto.js';
import { ReferenceService } from './reference.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type QueryParams = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

@ApiBearerAuth()
@ApiTags('References')
@Controller('api/v1/references')
@UseGuards(AuthGuard, RbacGuard)
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get()
  @RequirePermissions(Permissions.REFERENCES_VIEW)
  @ApiOperation({
    summary: 'List references',
    description:
      'Requires `references.view`. Returns system references plus references scoped to the current tenant.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'per_page', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: [
      'reference',
      'key',
      'group',
      'value',
      'type',
      'status',
      'updated',
      'updated_at',
      'created_at',
    ],
  })
  @ApiQuery({ name: 'direction', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'filter[group]', required: false, type: String })
  @ApiQuery({ name: 'filter[type]', required: false, type: String })
  @ApiQuery({ name: 'filter[status]', required: false, type: String })
  @ApiQuery({
    name: 'filter[scope]',
    required: false,
    enum: ['system', 'tenant'],
  })
  @ApiOkResponse({ type: PaginatedReferenceListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async index(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<PaginatedReferenceListEnvelopeDto> {
    return this.referenceService.findReferences(
      this.tenantId(request),
      query,
      this.requestUrl(request),
    );
  }

  @Get('types')
  @RequirePermissions(Permissions.REFERENCES_VIEW)
  @ApiOperation({
    summary: 'Reference type options',
    description: 'Requires `references.view`.',
  })
  @ApiOkResponse({ type: ReferenceOptionListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async referenceTypes(
    @Req() request: RequestWithUser,
  ): Promise<ReferenceOptionListEnvelopeDto> {
    return {
      data: await this.referenceService.referenceTypeOptions(
        this.tenantId(request),
      ),
    };
  }

  @Get('groups')
  @RequirePermissions(Permissions.REFERENCES_VIEW)
  @ApiOperation({
    summary: 'Reference group options',
    description: 'Requires `references.view`.',
  })
  @ApiOkResponse({ type: ReferenceOptionListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async groups(
    @Req() request: RequestWithUser,
  ): Promise<ReferenceOptionListEnvelopeDto> {
    return {
      data: await this.referenceService.groupOptions(this.tenantId(request)),
    };
  }

  @Post()
  @RequirePermissions(Permissions.REFERENCES_CREATE)
  @ApiOperation({
    summary: 'Create reference',
    description:
      'Requires `references.create`. System references additionally require `references.manage_system` or `system.bypass`.',
  })
  @ApiCreatedResponse({ type: ReferenceEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async store(
    @Req() request: RequestWithUser,
    @Body() dto: StoreReferenceDto,
  ): Promise<ReferenceEnvelopeDto> {
    return {
      data: await this.referenceService.createReference(
        this.tenantId(request),
        request.user,
        dto,
      ),
    };
  }

  @Get(':reference')
  @RequirePermissions(Permissions.REFERENCES_VIEW)
  @ApiOperation({
    summary: 'Reference details',
    description: 'Requires `references.view`.',
  })
  @ApiOkResponse({ type: ReferenceEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Reference is outside current tenant scope or not found.',
  })
  async show(
    @Req() request: RequestWithUser,
    @Param('reference') reference: string,
  ): Promise<ReferenceEnvelopeDto> {
    return {
      data: await this.referenceService.findReference(
        this.tenantId(request),
        reference,
      ),
    };
  }

  @Patch(':reference')
  @ApiOperation({
    summary: 'Update reference',
    description:
      'Requires `references.update`. System references additionally require `references.manage_system` or `system.bypass`.',
  })
  @ApiOkResponse({ type: ReferenceEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Reference is outside current tenant scope or not found.',
  })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async update(
    @Req() request: RequestWithUser,
    @Param('reference') reference: string,
    @Body() dto: UpdateReferenceDto,
  ): Promise<ReferenceEnvelopeDto> {
    return {
      data: await this.referenceService.updateReference(
        this.tenantId(request),
        request.user,
        reference,
        dto,
      ),
    };
  }

  @Delete(':reference')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete reference',
    description:
      'Requires `references.delete`. System references additionally require `references.manage_system` or `system.bypass`.',
  })
  @ApiNoContentResponse({ description: 'Reference deleted.' })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Reference is outside current tenant scope or not found.',
  })
  async destroy(
    @Req() request: RequestWithUser,
    @Param('reference') reference: string,
  ): Promise<void> {
    await this.referenceService.deleteReference(
      this.tenantId(request),
      request.user,
      reference,
    );
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
