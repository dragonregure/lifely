import {
  Body,
  Controller,
  ForbiddenException,
  Get,
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
  ListingEnvelopeDto,
  PaginatedListingListEnvelopeDto,
  StoreListingDto,
  UpdateListingDto,
} from './listing.dto.js';
import { ListingService } from './listing.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type QueryParams = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

@ApiBearerAuth()
@ApiTags('Listings')
@Controller('api/v1/listings')
@UseGuards(AuthGuard, RbacGuard)
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get()
  @RequirePermissions(Permissions.LISTINGS_VIEW)
  @ApiOperation({
    summary: 'List listings',
    description:
      'Requires `listings.view`. Supports server-side pagination, search, filters, sorting, and whitelisted relation includes.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'per_page', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'include[]',
    required: false,
    enum: ['documents', 'contacts', 'users'],
    isArray: true,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: [
      'title',
      'address',
      'price',
      'status',
      'bedrooms',
      'bathrooms',
      'type',
      'property_type',
      'created_at',
    ],
  })
  @ApiQuery({ name: 'direction', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'filter[status]', required: false, type: Number })
  @ApiQuery({ name: 'filter[property_type]', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedListingListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async index(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<PaginatedListingListEnvelopeDto> {
    return this.listingService.findListings(
      this.tenantId(request),
      query,
      this.requestUrl(request),
    );
  }

  @Post()
  @RequirePermissions(Permissions.LISTINGS_CREATE)
  @ApiOperation({
    summary: 'Create listing',
    description: 'Requires `listings.create`.',
  })
  @ApiCreatedResponse({ type: ListingEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async store(
    @Req() request: RequestWithUser,
    @Body() dto: StoreListingDto,
  ): Promise<ListingEnvelopeDto> {
    return {
      data: await this.listingService.createListing(
        this.tenantId(request),
        dto,
      ),
    };
  }

  @Get(':listing')
  @RequirePermissions(Permissions.LISTINGS_VIEW)
  @ApiOperation({
    summary: 'Listing details',
    description:
      'Requires `listings.view`. Returns main listing fields only unless relation names are requested with `include[]`.',
  })
  @ApiQuery({
    name: 'include[]',
    required: false,
    enum: ['documents', 'contacts', 'users'],
    isArray: true,
  })
  @ApiOkResponse({ type: ListingEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Listing is outside current tenant scope or not found.',
  })
  async show(
    @Req() request: RequestWithUser,
    @Param('listing') listing: string,
    @Query() query: QueryParams,
  ): Promise<ListingEnvelopeDto> {
    return {
      data: await this.listingService.findListing(
        this.tenantId(request),
        listing,
        query,
      ),
    };
  }

  @Patch(':listing')
  @RequirePermissions(Permissions.LISTINGS_UPDATE)
  @ApiOperation({
    summary: 'Update listing',
    description: 'Requires `listings.update`.',
  })
  @ApiOkResponse({ type: ListingEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Listing is outside current tenant scope or not found.',
  })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async update(
    @Req() request: RequestWithUser,
    @Param('listing') listing: string,
    @Body() dto: UpdateListingDto,
  ): Promise<ListingEnvelopeDto> {
    return this.updateExistingListing(request, listing, dto);
  }

  @Put(':listing')
  @RequirePermissions(Permissions.LISTINGS_UPDATE)
  @ApiOperation({
    summary: 'Update listing',
    description:
      'Requires `listings.update`. Accepts the same fields as PATCH.',
  })
  @ApiOkResponse({ type: ListingEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiNotFoundResponse({
    description: 'Listing is outside current tenant scope or not found.',
  })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async replace(
    @Req() request: RequestWithUser,
    @Param('listing') listing: string,
    @Body() dto: UpdateListingDto,
  ): Promise<ListingEnvelopeDto> {
    return this.updateExistingListing(request, listing, dto);
  }

  private async updateExistingListing(
    request: RequestWithUser,
    listing: string,
    dto: UpdateListingDto,
  ): Promise<ListingEnvelopeDto> {
    return {
      data: await this.listingService.updateListing(
        this.tenantId(request),
        listing,
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
