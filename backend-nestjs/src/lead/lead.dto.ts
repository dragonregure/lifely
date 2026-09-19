import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactResponseDto } from '../contact/contact.dto.js';
import { ListingResponseDto } from '../listing/listing.dto.js';
import {
  MemberResponseDto,
  PaginationLinksDto,
  PaginationMetaDto,
} from '../user/user.dto.js';
import {
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_LABELS,
  leadSourceFromInput,
  leadSourceValues,
  leadStageFromInput,
  leadStageValues,
} from './lead.constants.js';

const leadStageTransform = ({ value }: { value: unknown }) =>
  value === null ? null : (leadStageFromInput(value) ?? value);

const leadSourceTransform = ({ value }: { value: unknown }) =>
  value === null ? null : (leadSourceFromInput(value) ?? value);

export class LeadResponseDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  tenant_id!: string;

  @ApiProperty({ example: '018f8de0-7424-7c71-a0f9-14d364f50d84' })
  contact_id!: string;

  @ApiProperty({ example: '018f8de0-7f2d-7c71-bb64-347037ba9a57' })
  listing_id!: string;

  @ApiProperty({ example: '018f8de0-6aba-7c71-b65d-95302af6be84' })
  user_id!: string;

  @ApiProperty({
    example: LEAD_STAGE_LABELS[2],
    enum: Object.values(LEAD_STAGE_LABELS),
  })
  stage!: string;

  @ApiProperty({ example: 0, enum: leadSourceValues() })
  source_id!: number;

  @ApiProperty({
    example: LEAD_SOURCE_LABELS[0],
    enum: Object.values(LEAD_SOURCE_LABELS),
  })
  source!: string;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: 875000 })
  value!: number;

  @ApiPropertyOptional({
    example: 'Confirm budget and timeline',
    nullable: true,
  })
  next_task!: string | null;

  @ApiPropertyOptional({
    example: '2026-09-16T08:00:00.000Z',
    nullable: true,
  })
  due_at!: string | null;

  @ApiPropertyOptional({ type: ContactResponseDto })
  contact?: ContactResponseDto;

  @ApiPropertyOptional({ type: ListingResponseDto })
  listing?: ListingResponseDto;

  @ApiPropertyOptional({ type: MemberResponseDto })
  user?: MemberResponseDto;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;
}

export class StoreLeadDto {
  @ApiProperty({ example: '018f8de0-7424-7c71-a0f9-14d364f50d84' })
  @IsUUID()
  contact_id!: string;

  @ApiProperty({ example: '018f8de0-7f2d-7c71-bb64-347037ba9a57' })
  @IsUUID()
  listing_id!: string;

  @ApiProperty({ example: '018f8de0-6aba-7c71-b65d-95302af6be84' })
  @IsUUID()
  user_id!: string;

  @ApiPropertyOptional({
    example: 'Qualified',
    enum: Object.values(LEAD_STAGE_LABELS),
    nullable: true,
  })
  @Transform(leadStageTransform)
  @IsIn(leadStageValues())
  @IsOptional()
  stage?: number | null;

  @ApiPropertyOptional({
    example: 'Manual Entry',
    enum: Object.values(LEAD_SOURCE_LABELS),
    nullable: true,
  })
  @Transform(leadSourceTransform)
  @IsIn(leadSourceValues())
  @IsOptional()
  source?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    example: 'Confirm budget and timeline',
    nullable: true,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  next_task?: string | null;

  @ApiPropertyOptional({
    example: '2026-09-16T08:00:00Z',
    nullable: true,
  })
  @IsDateString()
  @IsOptional()
  due_at?: string | null;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ example: '018f8de0-7424-7c71-a0f9-14d364f50d84' })
  @IsUUID()
  @IsOptional()
  contact_id?: string;

  @ApiPropertyOptional({ example: '018f8de0-7f2d-7c71-bb64-347037ba9a57' })
  @IsUUID()
  @IsOptional()
  listing_id?: string;

  @ApiPropertyOptional({ example: '018f8de0-6aba-7c71-b65d-95302af6be84' })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({
    example: 'Negotiating',
    enum: Object.values(LEAD_STAGE_LABELS),
  })
  @Transform(leadStageTransform)
  @IsIn(leadStageValues())
  @IsOptional()
  stage?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 'Send revised offer.', nullable: true })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  next_task?: string | null;
}

export class UpdateLeadStageDto {
  @ApiProperty({
    example: 'Closed Won',
    enum: Object.values(LEAD_STAGE_LABELS),
  })
  @Transform(leadStageTransform)
  @IsIn(leadStageValues())
  stage!: number;
}

export class LeadEnvelopeDto {
  @ApiProperty({ type: LeadResponseDto })
  data!: LeadResponseDto;
}

export class PaginatedLeadListEnvelopeDto {
  @ApiProperty({ type: LeadResponseDto, isArray: true })
  data!: LeadResponseDto[];

  @ApiProperty({ type: PaginationLinksDto })
  links!: PaginationLinksDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
