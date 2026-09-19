import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationLinksDto, PaginationMetaDto } from '../user/user.dto.js';
import type {
  ReferenceMeta,
  ReferenceStatus,
  ReferenceValue,
  ReferenceValueType,
} from './reference.type.js';

export const REFERENCE_VALUE_TYPES: ReferenceValueType[] = [
  'string',
  'int',
  'float',
  'double',
  'bool',
  'array',
  'object',
  'null',
];

export const REFERENCE_STATUSES: ReferenceStatus[] = ['ACTIVE', 'INACTIVE'];

export class ReferenceResponseDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiPropertyOptional({
    example: '018f8de0-61ef-7c71-bf36-1513b7d6db46',
    nullable: true,
  })
  tenant_id!: string | null;

  @ApiProperty({ example: false })
  is_system!: boolean;

  @ApiProperty({ example: 'street_type' })
  group!: string;

  @ApiProperty({ example: 'ave' })
  key!: string;

  @ApiPropertyOptional({ example: 'Avenue', nullable: true })
  value!: ReferenceValue;

  @ApiProperty({ example: 'string', enum: REFERENCE_VALUE_TYPES })
  type!: string;

  @ApiPropertyOptional({ example: { color: 'blue' }, nullable: true })
  meta!: ReferenceMeta;

  @ApiProperty({ example: 'ACTIVE', enum: REFERENCE_STATUSES })
  status!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  updated_at!: string;
}

export class StoreReferenceDto {
  @ApiPropertyOptional({
    example: '018f8de0-61ef-7c71-bf36-1513b7d6db46',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  tenant_id?: string | null;

  @ApiProperty({ example: 'street_type' })
  @IsString()
  @MaxLength(120)
  group!: string;

  @ApiProperty({ example: 'ave' })
  @IsString()
  @MaxLength(120)
  key!: string;

  @ApiPropertyOptional({ example: 'Avenue', nullable: true })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  value?: string | null;

  @ApiPropertyOptional({ example: 'string', enum: REFERENCE_VALUE_TYPES })
  @IsString()
  @IsIn(REFERENCE_VALUE_TYPES)
  @IsOptional()
  type?: ReferenceValueType;

  @ApiPropertyOptional({ example: { color: 'blue' }, nullable: true })
  @IsObject()
  @IsOptional()
  meta?: ReferenceMeta;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: REFERENCE_STATUSES })
  @IsIn(REFERENCE_STATUSES)
  @IsOptional()
  status?: ReferenceStatus;
}

export class UpdateReferenceDto extends PartialType(StoreReferenceDto) {}

export class ReferenceOptionDto {
  @ApiProperty({ example: 'Street Type' })
  label!: string;

  @ApiProperty({ example: 'street_type' })
  value!: string;
}

export class ReferenceEnvelopeDto {
  @ApiProperty({ type: ReferenceResponseDto })
  data!: ReferenceResponseDto;
}

export class ReferenceOptionListEnvelopeDto {
  @ApiProperty({ type: ReferenceOptionDto, isArray: true })
  data!: ReferenceOptionDto[];
}

export class PaginatedReferenceListEnvelopeDto {
  @ApiProperty({ type: ReferenceResponseDto, isArray: true })
  data!: ReferenceResponseDto[];

  @ApiProperty({ type: PaginationLinksDto })
  links!: PaginationLinksDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
