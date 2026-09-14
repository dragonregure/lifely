import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { ApiResponseInterceptor } from '../common/interceptors/api-response.interceptor.js';
import { RequirePermissions } from '../rbac/permissions.decorator.js';
import { Permissions } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import {
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

@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(MemberListEnvelopeDto, PaginatedMemberListEnvelopeDto)
@Controller('api/v1')
@UseGuards(AuthGuard, RbacGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('tenant')
  @RequirePermissions(Permissions.TENANT_VIEW)
  @ApiOkResponse({ type: TenantEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async tenant(@Req() request: RequestWithUser) {
    return {
      data: await this.userService.findTenant(this.tenantId(request)),
    };
  }

  @Get('members')
  @RequirePermissions(Permissions.USERS_VIEW)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(MemberListEnvelopeDto) },
        { $ref: getSchemaPath(PaginatedMemberListEnvelopeDto) },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async members(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<MemberListEnvelopeDto | PaginatedMemberListEnvelopeDto> {
    const result = await this.userService.findMembers(
      this.tenantId(request),
      query,
    );

    return Array.isArray(result) ? { data: result } : result;
  }

  @Get('me/permissions')
  @ApiOkResponse({ type: UserAccessEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async mePermissions(@Req() request: RequestWithUser) {
    return {
      data: await this.userService.findUserAccess(request.user.id),
    };
  }

  @Get('users')
  @RequirePermissions(Permissions.USERS_VIEW)
  @UseInterceptors(ApiResponseInterceptor)
  @ApiOkResponse({ type: UserListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async findAll(@Req() request: RequestWithUser): Promise<UserResponseDto[]> {
    const result = await this.userService.findMembers(
      this.tenantId(request),
      {},
    );

    return Array.isArray(result) ? result : result.data;
  }

  @Get('users/:id')
  @RequirePermissions(Permissions.USERS_VIEW)
  @UseInterceptors(ApiResponseInterceptor)
  @ApiOkResponse({ type: UserEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
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
}
