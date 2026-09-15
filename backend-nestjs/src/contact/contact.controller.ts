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
  Put,
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
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import {
  ContactEnvelopeDto,
  PaginatedContactListEnvelopeDto,
  StoreContactDto,
  UpdateContactDto,
} from './contact.dto.js';
import { ContactService } from './contact.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type QueryParams = Record<string, string | string[] | undefined>;

@ApiBearerAuth()
@ApiTags('Contacts')
@Controller('api/v1/contacts')
@UseGuards(AuthGuard, RbacGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @RequirePermissions(Permissions.CONTACTS_VIEW)
  @ApiOperation({
    summary: 'List contacts',
    description:
      'Requires `contacts.view`. Supports server-side pagination, search, filters, and sorting.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'per_page', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: [
      'contact',
      'first_name',
      'last_name',
      'email',
      'status',
      'owner',
      'budget',
      'source',
      'last-contacted',
      'created_at',
    ],
  })
  @ApiQuery({ name: 'direction', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'filter[status]', required: false, type: String })
  @ApiQuery({ name: 'filter[source]', required: false, type: String })
  @ApiQuery({ name: 'filter[owner_id]', required: false, type: String })
  @ApiOkResponse({ type: PaginatedContactListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async index(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<PaginatedContactListEnvelopeDto> {
    return this.contactService.findContacts(
      this.tenantId(request),
      query,
      this.requestUrl(request),
    );
  }

  @Post()
  @RequirePermissions(Permissions.CONTACTS_CREATE)
  @ApiOperation({
    summary: 'Create contact',
    description: 'Requires `contacts.create`.',
  })
  @ApiCreatedResponse({ type: ContactEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async store(
    @Req() request: RequestWithUser,
    @Body() dto: StoreContactDto,
  ): Promise<ContactEnvelopeDto> {
    return {
      data: await this.contactService.createContact(
        this.tenantId(request),
        dto,
      ),
    };
  }

  @Get(':contact')
  @RequirePermissions(Permissions.CONTACTS_VIEW)
  @ApiOperation({
    summary: 'Contact details',
    description: 'Requires `contacts.view`.',
  })
  @ApiOkResponse({ type: ContactEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Contact is outside current tenant scope or not found.',
  })
  async show(
    @Req() request: RequestWithUser,
    @Param('contact') contact: string,
  ): Promise<ContactEnvelopeDto> {
    return {
      data: await this.contactService.findContact(
        this.tenantId(request),
        contact,
      ),
    };
  }

  @Patch(':contact')
  @RequirePermissions(Permissions.CONTACTS_UPDATE)
  @ApiOperation({
    summary: 'Update contact',
    description: 'Requires `contacts.update`.',
  })
  @ApiOkResponse({ type: ContactEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Contact is outside current tenant scope or not found.',
  })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async update(
    @Req() request: RequestWithUser,
    @Param('contact') contact: string,
    @Body() dto: UpdateContactDto,
  ): Promise<ContactEnvelopeDto> {
    return this.updateExistingContact(request, contact, dto);
  }

  @Put(':contact')
  @RequirePermissions(Permissions.CONTACTS_UPDATE)
  @ApiOperation({
    summary: 'Update contact',
    description:
      'Requires `contacts.update`. Accepts the same fields as PATCH.',
  })
  @ApiOkResponse({ type: ContactEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Contact is outside current tenant scope or not found.',
  })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async replace(
    @Req() request: RequestWithUser,
    @Param('contact') contact: string,
    @Body() dto: UpdateContactDto,
  ): Promise<ContactEnvelopeDto> {
    return this.updateExistingContact(request, contact, dto);
  }

  private async updateExistingContact(
    request: RequestWithUser,
    contact: string,
    dto: UpdateContactDto,
  ): Promise<ContactEnvelopeDto> {
    return {
      data: await this.contactService.updateContact(
        this.tenantId(request),
        contact,
        dto,
      ),
    };
  }

  @Delete(':contact')
  @RequirePermissions(Permissions.CONTACTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete contact',
    description: 'Requires `contacts.delete`.',
  })
  @ApiNoContentResponse({ description: 'Contact deleted.' })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Contact is outside current tenant scope or not found.',
  })
  async destroy(
    @Req() request: RequestWithUser,
    @Param('contact') contact: string,
  ): Promise<void> {
    await this.contactService.deleteContact(this.tenantId(request), contact);
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
