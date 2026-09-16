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

export class MemberResponseDto {
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

  @ApiProperty({ example: 'Avery Admin' })
  name!: string;

  @ApiProperty({ example: 'avery@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: true })
  is_primary_owner?: boolean;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;
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
  @ApiProperty({ type: MemberResponseDto, isArray: true })
  data!: MemberResponseDto[];
}

export class MemberEnvelopeDto {
  @ApiProperty({ type: MemberResponseDto })
  data!: MemberResponseDto;
}

export class TenantEnvelopeDto {
  @ApiProperty({ type: TenantResponseDto })
  data!: TenantResponseDto;
}

export class UserAccessEnvelopeDto {
  @ApiProperty({ type: UserAccessDto })
  data!: UserAccessDto;
}

export class PaginationLinkDto {
  @ApiProperty({
    example: 'http://localhost/api/v1/members?page=1',
    nullable: true,
  })
  url!: string | null;

  @ApiProperty({ example: '1' })
  label!: string;

  @ApiProperty({ example: true })
  active!: boolean;
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

  @ApiProperty({ example: 'http://localhost/api/v1/members' })
  path!: string;

  @ApiProperty({ example: 15, nullable: true })
  to!: number | null;

  @ApiProperty({ example: 32 })
  total!: number;

  @ApiProperty({
    isArray: true,
    example: [
      { url: null, label: '&laquo; Previous', active: false },
      {
        url: 'http://localhost/api/v1/members?page=1',
        label: '1',
        active: true,
      },
      { url: null, label: 'Next &raquo;', active: false },
    ],
  })
  links!: PaginationLinkDto[];
}

export class PaginationLinksDto {
  @ApiProperty({ example: 'http://localhost/api/v1/members?page=1' })
  first!: string;

  @ApiProperty({ example: 'http://localhost/api/v1/members?page=3' })
  last!: string;

  @ApiProperty({ example: null, nullable: true })
  prev!: string | null;

  @ApiProperty({
    example: 'http://localhost/api/v1/members?page=2',
    nullable: true,
  })
  next!: string | null;
}

export class PaginatedMemberListEnvelopeDto {
  @ApiProperty({ type: MemberResponseDto, isArray: true })
  data!: MemberResponseDto[];

  @ApiProperty({ type: PaginationLinksDto })
  links!: PaginationLinksDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
