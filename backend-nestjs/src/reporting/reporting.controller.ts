import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { RequirePermissions } from '../rbac/permissions.decorator.js';
import { Permissions } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import {
  ReportRowsEnvelopeDto,
  ReportingOverviewEnvelopeDto,
} from './reporting.dto.js';
import { ReportingService } from './reporting.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type QueryParams = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

@ApiBearerAuth()
@ApiTags('Reporting')
@Controller()
@UseGuards(AuthGuard, RbacGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('api/v1/reports')
  @RequirePermissions(Permissions.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Reporting overview',
    description:
      'Requires `reports.view`. Returns the CRM-backed dashboard, report definitions, and export formats.',
  })
  @ApiOkResponse({ type: ReportingOverviewEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async index(
    @Req() request: RequestWithUser,
    @Query() query: QueryParams,
  ): Promise<ReportingOverviewEnvelopeDto> {
    return {
      data: await this.reportingService.overview(this.tenantId(request), query),
    };
  }

  @Get('api/v1/reports/:report/rows')
  @RequirePermissions(Permissions.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Paginated report rows',
    description:
      'Requires `reports.view`. Supports server-side pagination, search, filters, and sorting.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'per_page', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'direction', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'filter[date_from]', required: false, type: String })
  @ApiQuery({ name: 'filter[date_to]', required: false, type: String })
  @ApiQuery({ name: 'filter[owner_id]', required: false, type: String })
  @ApiQuery({ name: 'filter[source]', required: false, type: String })
  @ApiQuery({ name: 'filter[stage]', required: false, type: String })
  @ApiQuery({ name: 'filter[status]', required: false, type: String })
  @ApiQuery({
    name: 'filter[risk_threshold_days]',
    required: false,
    type: String,
  })
  @ApiOkResponse({ type: ReportRowsEnvelopeDto })
  @ApiNotFoundResponse({ description: 'Report not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  async rows(
    @Req() request: RequestWithUser,
    @Param('report') report: string,
    @Query() query: QueryParams,
  ): Promise<ReportRowsEnvelopeDto> {
    return this.reportingService.rows(this.tenantId(request), report, query);
  }

  @Get('api/v1/reports/:report/export')
  @RequirePermissions(Permissions.REPORTS_VIEW)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({
    summary: 'Export report',
    description:
      'Requires `reports.view`. CSV export is implemented and audited to activity logs.',
  })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx', 'pdf'] })
  @ApiOkResponse({ description: 'CSV file stream.' })
  @ApiNotFoundResponse({ description: 'Report not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated.' })
  @ApiUnprocessableEntityResponse({
    description: 'Requested export format is not implemented.',
  })
  async export(
    @Req() request: RequestWithUser,
    @Param('report') report: string,
    @Query() query: QueryParams,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const exported = await this.reportingService.exportCsv(
      this.tenantId(request),
      request.user.id,
      report,
      query,
    );
    response.header(
      'Content-Disposition',
      `attachment; filename="${exported.filename}"`,
    );

    return exported.content;
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
