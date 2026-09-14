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
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePermissions } from './permissions.decorator.js';
import {
  PermissionEnvelopeDto,
  PermissionListEnvelopeDto,
  RoleEnvelopeDto,
  RoleListEnvelopeDto,
  StorePermissionDto,
  StoreRoleDto,
  UpdatePermissionDto,
  UpdateRoleDto,
} from './rbac.dto.js';
import { RbacGuard } from './rbac.guard.js';
import { Permissions } from './rbac.constants.js';
import { RbacService } from './rbac.service.js';
import { AuthenticatedUser } from './rbac.types.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type QueryParams = Record<string, string | string[] | undefined>;

@ApiTags('Access Control')
@ApiBearerAuth()
@Controller('api/v1')
@UseGuards(AuthGuard, RbacGuard)
export class RolePermissionController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @RequirePermissions(Permissions.ROLES_VIEW)
  @ApiQuery({
    name: 'include[]',
    required: false,
    enum: ['permissions'],
    isArray: true,
  })
  @ApiOkResponse({ type: RoleListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async roles(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<RoleListEnvelopeDto> {
    return {
      data: await this.rbacService.listRoles(
        this.tenantId(request),
        this.rbacService.canManageSystemRoles(request.user),
        this.includes(query, ['permissions']),
      ),
    };
  }

  @Post('roles')
  @RequirePermissions(Permissions.ROLES_CREATE)
  @ApiCreatedResponse({ type: RoleEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async storeRole(
    @Req() request: RequestWithUser,
    @Body() dto: StoreRoleDto,
  ): Promise<RoleEnvelopeDto> {
    return {
      data: await this.rbacService.createRole(
        this.tenantId(request),
        this.rbacService.canManageSystemRoles(request.user),
        dto,
      ),
    };
  }

  @Get('roles/:role')
  @RequirePermissions(Permissions.ROLES_VIEW)
  @ApiParam({ name: 'role', type: Number })
  @ApiQuery({
    name: 'include[]',
    required: false,
    enum: ['permissions'],
    isArray: true,
  })
  @ApiOkResponse({ type: RoleEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async showRole(
    @Req() request: RequestWithUser,
    @Param('role') role: string,
    @Query() query: QueryParams,
  ): Promise<RoleEnvelopeDto> {
    return {
      data: await this.rbacService.findRole(
        this.tenantId(request),
        role,
        this.rbacService.canManageSystemRoles(request.user),
        this.includes(query, ['permissions']),
      ),
    };
  }

  @Put('roles/:role')
  @RequirePermissions(Permissions.ROLES_UPDATE)
  @ApiParam({ name: 'role', type: Number })
  @ApiOkResponse({ type: RoleEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async replaceRole(
    @Req() request: RequestWithUser,
    @Param('role') role: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleEnvelopeDto> {
    return this.updateRole(request, role, dto);
  }

  @Patch('roles/:role')
  @RequirePermissions(Permissions.ROLES_UPDATE)
  @ApiParam({ name: 'role', type: Number })
  @ApiOkResponse({ type: RoleEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateRole(
    @Req() request: RequestWithUser,
    @Param('role') role: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleEnvelopeDto> {
    return {
      data: await this.rbacService.updateRole(
        this.tenantId(request),
        role,
        this.rbacService.canManageSystemRoles(request.user),
        dto,
      ),
    };
  }

  @Delete('roles/:role')
  @RequirePermissions(Permissions.ROLES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'role', type: Number })
  @ApiNoContentResponse({ description: 'Role deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async destroyRole(
    @Req() request: RequestWithUser,
    @Param('role') role: string,
  ): Promise<void> {
    await this.rbacService.deleteRole(
      this.tenantId(request),
      role,
      this.rbacService.canManageSystemRoles(request.user),
    );
  }

  @Get('permissions')
  @RequirePermissions(Permissions.PERMISSIONS_VIEW)
  @ApiQuery({
    name: 'include[]',
    required: false,
    enum: ['roles'],
    isArray: true,
  })
  @ApiOkResponse({ type: PermissionListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async permissions(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<PermissionListEnvelopeDto> {
    return {
      data: await this.rbacService.listPermissions(
        this.rbacService.canManageSystemRoles(request.user),
        this.includes(query, ['roles']),
      ),
    };
  }

  @Post('permissions')
  @RequirePermissions(Permissions.SYSTEM_BYPASS)
  @ApiCreatedResponse({ type: PermissionEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async storePermission(
    @Body() dto: StorePermissionDto,
  ): Promise<PermissionEnvelopeDto> {
    return {
      data: await this.rbacService.createPermission(dto),
    };
  }

  @Get('permissions/:permission')
  @RequirePermissions(Permissions.PERMISSIONS_VIEW)
  @ApiParam({ name: 'permission', type: Number })
  @ApiQuery({
    name: 'include[]',
    required: false,
    enum: ['roles'],
    isArray: true,
  })
  @ApiOkResponse({ type: PermissionEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async showPermission(
    @Req() request: RequestWithUser,
    @Param('permission') permission: string,
    @Query() query: QueryParams,
  ): Promise<PermissionEnvelopeDto> {
    return {
      data: await this.rbacService.findPermission(
        permission,
        this.rbacService.canManageSystemRoles(request.user),
        this.includes(query, ['roles']),
      ),
    };
  }

  @Put('permissions/:permission')
  @RequirePermissions(Permissions.SYSTEM_BYPASS)
  @ApiParam({ name: 'permission', type: Number })
  @ApiOkResponse({ type: PermissionEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async replacePermission(
    @Param('permission') permission: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionEnvelopeDto> {
    return this.updatePermission(permission, dto);
  }

  @Patch('permissions/:permission')
  @RequirePermissions(Permissions.SYSTEM_BYPASS)
  @ApiParam({ name: 'permission', type: Number })
  @ApiOkResponse({ type: PermissionEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updatePermission(
    @Param('permission') permission: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionEnvelopeDto> {
    return {
      data: await this.rbacService.updatePermission(permission, dto),
    };
  }

  @Delete('permissions/:permission')
  @RequirePermissions(Permissions.SYSTEM_BYPASS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'permission', type: Number })
  @ApiNoContentResponse({ description: 'Permission deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async destroyPermission(
    @Param('permission') permission: string,
  ): Promise<void> {
    await this.rbacService.deletePermission(permission);
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

  private includes<T extends string>(query: QueryParams, allowed: T[]): T[] {
    const raw = query.include ?? query['include[]'] ?? [];
    const values = Array.isArray(raw) ? raw : [raw];

    return values.filter((value): value is T => allowed.includes(value as T));
  }

  private scalar(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return this.scalar(value[0]);
    }

    return typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : undefined;
  }
}
