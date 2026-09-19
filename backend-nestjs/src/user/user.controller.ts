import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { ApiResponseInterceptor } from '../common/interceptors/api-response.interceptor.js';
import { RequirePermissions } from '../rbac/permissions.decorator.js';
import { Permissions } from '../rbac/rbac.constants.js';
import { SyncUserPermissionsDto, SyncUserRolesDto } from '../rbac/rbac.dto.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import {
  MemberEnvelopeDto,
  MemberListEnvelopeDto,
  PaginatedMemberListEnvelopeDto,
  TenantEnvelopeDto,
  UserAccessEnvelopeDto,
  UserEnvelopeDto,
  UserListEnvelopeDto,
  UserResponseDto,
} from './user.dto.js';
import { UserService } from './user.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type QueryParams = Record<string, string | string[] | undefined>;

@ApiBearerAuth()
@ApiExtraModels(MemberListEnvelopeDto, PaginatedMemberListEnvelopeDto)
@Controller('api/v1')
@UseGuards(AuthGuard, RbacGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('tenant')
  @RequirePermissions(Permissions.TENANT_VIEW)
  @ApiTags('Tenant')
  @ApiOperation({
    summary: 'Current tenant',
    description: 'Requires `tenant.view`.',
  })
  @ApiOkResponse({ type: TenantEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async tenant(@Req() request: RequestWithUser) {
    return {
      data: await this.userService.findTenant(this.tenantId(request)),
    };
  }

  @Get('members')
  @RequirePermissions(Permissions.USERS_VIEW)
  @ApiTags('Tenant')
  @ApiOperation({
    summary: 'Office members',
    description:
      'Requires `users.view`. Without pagination parameters this returns all members for existing session/bootstrap flows. With `page`, `per_page`, `search`, or sort parameters it returns a paginated member list for server-side selectors.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Enables paginated mode and selects the page to return.',
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
    type: Number,
    description: 'Number of members per page in paginated mode.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Searches member name, email, and role in paginated mode.',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['name', 'email', 'role', 'created_at'],
    description: 'Sort column in paginated mode.',
  })
  @ApiQuery({
    name: 'direction',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction in paginated mode.',
  })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(MemberListEnvelopeDto) },
        { $ref: getSchemaPath(PaginatedMemberListEnvelopeDto) },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async members(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<MemberListEnvelopeDto | PaginatedMemberListEnvelopeDto> {
    const result = await this.userService.findMembers(
      this.tenantId(request),
      query,
      this.requestUrl(request),
    );

    return Array.isArray(result) ? { data: result } : result;
  }

  @Get('me/permissions')
  @ApiTags('Access Control')
  @ApiOperation({
    summary: "Current authenticated user's roles and permissions",
    description:
      'Returns role names, direct permissions, and all effective permissions for SPA authorization hints. Backend authorization remains authoritative.',
  })
  @ApiOkResponse({ type: UserAccessEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async mePermissions(@Req() request: RequestWithUser) {
    return {
      data: await this.userService.findUserAccess(request.user.id),
    };
  }

  @Put('users/:user/roles')
  @RequirePermissions(Permissions.USERS_ASSIGN_ROLES)
  @ApiTags('Access Control')
  @ApiOperation({
    summary: 'Sync roles to user',
    description:
      'Requires `users.assign_roles`. Requested roles must be system roles or current-tenant roles. Roles containing system-only permissions require `roles.manage_system`. Prevents removing the last Office Admin.',
  })
  @ApiParam({ name: 'user', type: String, format: 'uuid' })
  @ApiOkResponse({ type: MemberEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed or last Office Admin protection triggered.',
  })
  async syncRoles(
    @Req() request: RequestWithUser,
    @Param('user') user: string,
    @Body() dto: SyncUserRolesDto,
  ): Promise<MemberEnvelopeDto> {
    return {
      data: await this.userService.syncUserRoles(
        this.tenantId(request),
        request.user,
        user,
        dto,
      ),
    };
  }

  @Put('users/:user/permissions')
  @RequirePermissions(Permissions.USERS_ASSIGN_PERMISSIONS)
  @ApiTags('Access Control')
  @ApiOperation({
    summary: 'Sync direct permissions to user',
    description:
      'Requires `users.assign_permissions`. Tenant admins cannot assign system-only permissions such as `system.bypass`, `roles.manage_system`, `references.manage_system`, or permission create/update/delete capabilities.',
  })
  @ApiParam({ name: 'user', type: String, format: 'uuid' })
  @ApiOkResponse({ type: MemberEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed.' })
  async syncPermissions(
    @Req() request: RequestWithUser,
    @Param('user') user: string,
    @Body() dto: SyncUserPermissionsDto,
  ): Promise<MemberEnvelopeDto> {
    return {
      data: await this.userService.syncUserPermissions(
        this.tenantId(request),
        request.user,
        user,
        dto,
      ),
    };
  }

  @Get('users')
  @RequirePermissions(Permissions.USERS_VIEW)
  @UseInterceptors(ApiResponseInterceptor)
  @ApiExcludeEndpoint()
  @ApiOkResponse({ type: UserListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async findAll(@Req() request: RequestWithUser): Promise<UserResponseDto[]> {
    return this.userService.findUsersByTenant(this.tenantId(request));
  }

  @Get('users/:id')
  @RequirePermissions(Permissions.USERS_VIEW)
  @UseInterceptors(ApiResponseInterceptor)
  @ApiExcludeEndpoint()
  @ApiOkResponse({ type: UserEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async findById(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    const user = await this.userService.findById(id);

    if (user.tenant_id !== this.tenantId(request)) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
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
