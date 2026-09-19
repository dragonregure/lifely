import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationLinksDto, PaginationMetaDto } from '../user/user.dto.js';
import { ActivityProperties } from './activity.type.js';

export class ActivityLogResponseDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  tenant_id!: string;

  @ApiPropertyOptional({
    example: '018f8de0-7424-7c71-a0f9-14d364f50d84',
    nullable: true,
  })
  user_id!: string | null;

  @ApiPropertyOptional({ example: 'Nadia Stone', nullable: true })
  user_name!: string | null;

  @ApiProperty({ example: 'contact.updated' })
  action_type!: string;

  @ApiProperty({ example: 'Updated contact Nadia Stone: email.' })
  description!: string;

  @ApiPropertyOptional({
    example: {
      subject_type: 'contact',
      subject_id: '018f8de0-6503-7c71-8a83-85f895c7d2d3',
      changes: { email: { old: 'old@example.com', new: 'new@example.com' } },
    },
    nullable: true,
  })
  properties!: ActivityProperties | null;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;
}

export class PaginatedActivityLogListEnvelopeDto {
  @ApiProperty({ type: ActivityLogResponseDto, isArray: true })
  data!: ActivityLogResponseDto[];

  @ApiProperty({ type: PaginationLinksDto })
  links!: PaginationLinksDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
