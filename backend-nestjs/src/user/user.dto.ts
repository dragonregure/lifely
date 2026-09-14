import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  tenant_id!: string;

  @ApiProperty({ example: 'office_admin' })
  role!: string;

  @ApiProperty({ example: ['Office Admin'] })
  roles!: string[];

  @ApiProperty({ example: ['users.view'] })
  direct_permissions!: string[];

  @ApiPropertyOptional({ example: ['users.view'] })
  permissions?: string[];

  @ApiProperty({ example: 'Avery Admin' })
  name!: string;

  @ApiProperty({ example: 'avery@example.com' })
  email!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;

  @ApiPropertyOptional({ example: true })
  is_primary_owner?: boolean;
}

export class TenantResponseDto {
  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  id!: string;

  @ApiProperty({ example: 'Acme Realty' })
  name!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;
}

export class UserAccessDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  user_id!: string;

  @ApiProperty({ example: ['Office Admin'] })
  roles!: string[];

  @ApiProperty({ example: ['users.view'] })
  direct_permissions!: string[];

  @ApiProperty({ example: ['users.view', 'tenant.view'] })
  permissions!: string[];
}

export class UserEnvelopeDto {
  @ApiProperty({ type: UserResponseDto })
  data!: UserResponseDto;

  @ApiProperty({ example: 'Success' })
  message!: string;
}

export class UserListEnvelopeDto {
  @ApiProperty({ type: UserResponseDto, isArray: true })
  data!: UserResponseDto[];

  @ApiProperty({ example: 'Success' })
  message!: string;
}

export class MemberListEnvelopeDto {
  @ApiProperty({ type: UserResponseDto, isArray: true })
  data!: UserResponseDto[];
}

export class TenantEnvelopeDto {
  @ApiProperty({ type: TenantResponseDto })
  data!: TenantResponseDto;
}

export class UserAccessEnvelopeDto {
  @ApiProperty({ type: UserAccessDto })
  data!: UserAccessDto;
}

export class PaginationMetaDto {
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

export class PaginatedMemberListEnvelopeDto {
  @ApiProperty({ type: UserResponseDto, isArray: true })
  data!: UserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
