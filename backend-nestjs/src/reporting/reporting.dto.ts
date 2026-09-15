import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardExecutiveDto {
  @ApiProperty({ example: 42 })
  total_active_clients!: number;

  @ApiProperty({ example: 8 })
  new_clients!: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  total_visits!: number | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  completed_visits!: number | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  missed_visits!: number | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  cancelled_visits!: number | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  active_caregivers!: number | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  caregiver_utilization!: number | null;

  @ApiProperty({ example: 1250000 })
  revenue!: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  outstanding_payments!: number | null;

  @ApiProperty({ example: 875000 })
  pipeline_value!: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  client_satisfaction_score!: number | null;
}

export class DashboardMetricDto {
  @ApiProperty({ example: 'Active' })
  label!: string;

  @ApiProperty({ example: 12 })
  value!: number;
}

export class DashboardLeadStageDto {
  @ApiProperty({ example: 'New Lead' })
  stage!: string;

  @ApiProperty({ example: 5 })
  deals!: number;

  @ApiProperty({ example: 875000 })
  value!: number;
}

export class DashboardResponseDto {
  @ApiProperty({ example: 6 })
  new_leads!: number;

  @ApiProperty({ example: 3 })
  pending_tasks!: number;

  @ApiProperty({ example: 2125000 })
  lead_value!: number;

  @ApiProperty({ example: 62.5 })
  win_rate!: number;

  @ApiProperty({ type: DashboardMetricDto, isArray: true })
  lead_health!: DashboardMetricDto[];

  @ApiProperty({ type: DashboardLeadStageDto, isArray: true })
  lead_by_stage!: DashboardLeadStageDto[];

  @ApiProperty({ type: DashboardExecutiveDto })
  executive!: DashboardExecutiveDto;

  @ApiProperty({
    example: ['date_range', 'client', 'caregiver', 'service_type'],
  })
  available_filters!: string[];

  @ApiProperty({ example: ['branch', 'region'] })
  future_filters!: string[];

  @ApiProperty({ isArray: true, type: String })
  module_debt!: string[];
}

export class ReportColumnDto {
  @ApiProperty({ example: 'client' })
  key!: string;

  @ApiProperty({ example: 'Client' })
  label!: string;

  @ApiProperty({ example: 'text' })
  type!: string;

  @ApiProperty({ example: true })
  sortable!: boolean;
}

export class ReportDefinitionDto {
  @ApiProperty({ example: 'client-summary' })
  key!: string;

  @ApiProperty({ example: 'Client Reports' })
  category!: string;

  @ApiProperty({ example: 'Client Summary Report' })
  name!: string;

  @ApiProperty({ example: 'Client/contact status and pipeline value.' })
  description!: string;

  @ApiProperty({ example: true })
  implemented!: boolean;

  @ApiProperty({ type: ReportColumnDto, isArray: true })
  columns!: ReportColumnDto[];
}

export class ExportFormatDto {
  @ApiProperty({ example: 'csv' })
  key!: string;

  @ApiProperty({ example: 'CSV' })
  label!: string;

  @ApiProperty({ example: true })
  implemented!: boolean;
}

export class ReportingOverviewDto {
  @ApiProperty({ type: DashboardResponseDto })
  dashboard!: DashboardResponseDto;

  @ApiProperty({ type: ReportDefinitionDto, isArray: true })
  reports!: ReportDefinitionDto[];

  @ApiProperty({ type: ExportFormatDto, isArray: true })
  export_formats!: ExportFormatDto[];
}

export class DashboardEnvelopeDto {
  @ApiProperty({ type: DashboardResponseDto })
  data!: DashboardResponseDto;
}

export class ReportingOverviewEnvelopeDto {
  @ApiProperty({ type: ReportingOverviewDto })
  data!: ReportingOverviewDto;
}

export class ReportRowsMetaDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 1, nullable: true })
  from!: number | null;

  @ApiProperty({ example: 3 })
  last_page!: number;

  @ApiProperty({ example: 15 })
  per_page!: number;

  @ApiProperty({ example: 15, nullable: true })
  to!: number | null;

  @ApiProperty({ example: 32 })
  total!: number;
}

export class ReportRowsEnvelopeDto {
  @ApiProperty({
    isArray: true,
    example: [{ id: 'client-1', client: 'Ethan Miller', status: 'Active' }],
  })
  data!: Record<string, unknown>[];

  @ApiProperty({ type: ReportRowsMetaDto })
  meta!: ReportRowsMetaDto;
}
