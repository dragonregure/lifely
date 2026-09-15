import { Injectable } from '@nestjs/common';
import { DashboardResponseDto } from '../reporting/reporting.dto.js';
import { ReportingService } from '../reporting/reporting.service.js';

type QueryParams = Record<
  string,
  string | string[] | Record<string, unknown> | undefined
>;

@Injectable()
export class DashboardService {
  constructor(private readonly reportingService: ReportingService) {}

  summary(tenantId: string, query: QueryParams): Promise<DashboardResponseDto> {
    return this.reportingService.dashboardFromQuery(tenantId, query);
  }
}
