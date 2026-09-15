import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ContactResponseDto } from '../contact/contact.dto.js';
import {
  MemberResponseDto,
  PaginationLinksDto,
  PaginationMetaDto,
} from '../user/user.dto.js';

const LISTING_STATUSES = [1, 2, 3, 4] as const;
const LISTING_TYPES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
] as const;

export class ListingDocumentResponseDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  tenant_id!: string;

  @ApiProperty({ example: 'listing' })
  model!: string;

  @ApiProperty({ example: '018f8de0-7f2d-7c71-bb64-347037ba9a57' })
  model_id!: string;

  @ApiProperty({ example: 'image' })
  type!: string;

  @ApiPropertyOptional({ example: 'hero', nullable: true })
  subtype!: string | null;

  @ApiPropertyOptional({ example: 'villa.pdf', nullable: true })
  file_name!: string | null;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiProperty({ example: 'https://example.test/listings/villa.pdf' })
  url!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  updated_at!: string;
}

export class ListingResponseDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  tenant_id!: string;

  @ApiProperty({ example: 'Harbor View Villa' })
  title!: string;

  @ApiProperty({ example: 'Jl. Pantai Indah No. 10' })
  address!: string;

  @ApiProperty({ example: 1250000 })
  price!: number;

  @ApiProperty({ example: 1, enum: LISTING_STATUSES })
  status!: number;

  @ApiProperty({ example: 4 })
  bedrooms!: number;

  @ApiProperty({ example: 3 })
  bathrooms!: number;

  @ApiProperty({ example: 6, enum: LISTING_TYPES })
  property_type!: number;

  @ApiPropertyOptional({ type: ListingDocumentResponseDto, isArray: true })
  documents?: ListingDocumentResponseDto[];

  @ApiPropertyOptional({ type: ContactResponseDto, isArray: true })
  contacts?: ContactResponseDto[];

  @ApiPropertyOptional({ type: MemberResponseDto, isArray: true })
  users?: Array<MemberResponseDto & { is_primary_owner?: boolean | null }>;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;
}

export class StoreListingDto {
  @ApiProperty({ example: 'Harbor View Villa' })
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiProperty({ example: 'Jl. Pantai Indah No. 10' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 1250000 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 1, enum: LISTING_STATUSES, nullable: true })
  @IsInt()
  @IsIn(LISTING_STATUSES)
  @IsOptional()
  status?: number | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  bedrooms?: number | null;

  @ApiPropertyOptional({ example: 3, nullable: true })
  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  bathrooms?: number | null;

  @ApiPropertyOptional({ example: 6, enum: LISTING_TYPES, nullable: true })
  @IsInt()
  @IsIn(LISTING_TYPES)
  @IsOptional()
  property_type?: number | null;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    nullable: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  contact_ids?: string[] | null;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    nullable: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  user_ids?: string[] | null;

  @ApiPropertyOptional({ nullable: true })
  @IsUUID()
  @IsOptional()
  primary_owner_user_id?: string | null;
}

export class UpdateListingDto extends PartialType(StoreListingDto) {}

export class ListingEnvelopeDto {
  @ApiProperty({ type: ListingResponseDto })
  data!: ListingResponseDto;
}

export class PaginatedListingListEnvelopeDto {
  @ApiProperty({ type: ListingResponseDto, isArray: true })
  data!: ListingResponseDto[];

  @ApiProperty({ type: PaginationLinksDto })
  links!: PaginationLinksDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export const listingStatuses = (): readonly number[] => LISTING_STATUSES;
export const listingTypes = (): readonly number[] => LISTING_TYPES;
