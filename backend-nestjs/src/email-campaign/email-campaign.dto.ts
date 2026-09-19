import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationLinksDto, PaginationMetaDto } from '../user/user.dto.js';

export class EmailCampaignResponseDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  tenant_id!: string;

  @ApiPropertyOptional({
    example: '018f8de0-7424-7c71-a0f9-14d364f50d84',
    nullable: true,
  })
  user_id!: string | null;

  @ApiPropertyOptional({
    example: '018f8de0-7424-7c71-a0f9-14d364f50d84',
    nullable: true,
  })
  listing_id!: string | null;

  @ApiProperty({ example: 'Open house follow-up' })
  subject!: string;

  @ApiProperty({ example: 24 })
  recipient_count!: number;

  @ApiProperty({ example: 'Queued' })
  status!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;
}

export class SendBulkEmailDto {
  @ApiPropertyOptional({
    example: '018f8de0-7424-7c71-a0f9-14d364f50d84',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  user_id?: string | null;

  @ApiPropertyOptional({
    example: '018f8de0-7424-7c71-a0f9-14d364f50d84',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  listing_id?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  all_active_contacts?: boolean;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['018f8de0-7424-7c71-a0f9-14d364f50d84'],
  })
  @ValidateIf((dto: SendBulkEmailDto) => dto.all_active_contacts !== true)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  contact_ids?: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['018f8de0-7424-7c71-a0f9-14d364f50d84'],
  })
  @ValidateIf((dto: SendBulkEmailDto) => dto.all_active_contacts === true)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  included_contact_ids?: string[];

  @ApiProperty({ example: 'Open house follow-up' })
  @IsString()
  @MaxLength(180)
  subject!: string;

  @ApiProperty({ example: 'Thanks for visiting our open house.' })
  @IsString()
  @MaxLength(10000)
  body!: string;
}

export class EmailCampaignEnvelopeDto {
  @ApiProperty({ type: EmailCampaignResponseDto })
  data!: EmailCampaignResponseDto;
}

export class PaginatedEmailCampaignListEnvelopeDto {
  @ApiProperty({ type: EmailCampaignResponseDto, isArray: true })
  data!: EmailCampaignResponseDto[];

  @ApiProperty({ type: PaginationLinksDto })
  links!: PaginationLinksDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
