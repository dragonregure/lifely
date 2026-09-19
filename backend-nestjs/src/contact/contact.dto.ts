import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationLinksDto, PaginationMetaDto } from '../user/user.dto.js';

export class ContactResponseDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  tenant_id!: string;

  @ApiPropertyOptional({
    example: '018f8de0-7424-7c71-a0f9-14d364f50d84',
    nullable: true,
  })
  owner_id!: string | null;

  @ApiProperty({ example: 'Nadia' })
  first_name!: string;

  @ApiProperty({ example: 'Stone' })
  last_name!: string;

  @ApiProperty({ example: 'nadia@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: '+62811111111', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: true })
  status!: boolean;

  @ApiProperty({ example: 'Active' })
  status_label!: 'Active' | 'Inactive';

  @ApiPropertyOptional({ example: 450000, nullable: true })
  budget!: number | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  source_id!: number | null;

  @ApiPropertyOptional({ example: 'Referral', nullable: true })
  source!: string | null;

  @ApiPropertyOptional({
    example: '2026-05-30T00:00:00.000Z',
    nullable: true,
  })
  last_contacted_at!: string | null;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;
}

export class StoreContactDto {
  @ApiPropertyOptional({
    example: '018f8de0-7424-7c71-a0f9-14d364f50d84',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  owner_id?: string | null;

  @ApiProperty({ example: 'Nadia' })
  @IsString()
  @MaxLength(120)
  first_name!: string;

  @ApiProperty({ example: 'Stone' })
  @IsString()
  @MaxLength(120)
  last_name!: string;

  @ApiProperty({ example: 'nadia@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '+62811111111', nullable: true })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @ApiPropertyOptional({ example: 450000, nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  @IsInt()
  @Min(0)
  @Max(15)
  @IsOptional()
  source?: number | null;

  @ApiPropertyOptional({
    example: '2026-05-30T00:00:00Z',
    nullable: true,
  })
  @IsDateString()
  @IsOptional()
  last_contacted_at?: string | null;
}

export class UpdateContactDto extends PartialType(StoreContactDto) {}

export class ContactEnvelopeDto {
  @ApiProperty({ type: ContactResponseDto })
  data!: ContactResponseDto;
}

export class PaginatedContactListEnvelopeDto {
  @ApiProperty({ type: ContactResponseDto, isArray: true })
  data!: ContactResponseDto[];

  @ApiProperty({ type: PaginationLinksDto })
  links!: PaginationLinksDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
