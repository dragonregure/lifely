import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePermissions } from '../rbac/permissions.decorator.js';
import { Permissions } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { DashboardEnvelopeDto } from '../reporting/reporting.dto.js';
import { DashboardService } from './dashboard.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type QueryParams = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

@ApiBearerAuth()
@ApiTags('Dashboard')
@Controller('api/v1/dashboard')
@UseGuards(AuthGuard, RbacGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequirePermissions(Permissions.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Dashboard summary',
    description: 'Requires `reports.view`.',
  })
  @ApiQuery({ name: 'filter[date_from]', required: false, type: String })
  @ApiQuery({ name: 'filter[date_to]', required: false, type: String })
  @ApiQuery({ name: 'filter[owner_id]', required: false, type: String })
  @ApiQuery({ name: 'filter[source]', required: false, type: String })
  @ApiQuery({ name: 'filter[stage]', required: false, type: String })
  @ApiOkResponse({ type: DashboardEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async show(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<DashboardEnvelopeDto> {
    return {
      data: await this.dashboardService.summary(this.tenantId(request), query),
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
}
