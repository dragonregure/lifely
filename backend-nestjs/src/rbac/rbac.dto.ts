import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class PermissionResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'roles.view' })
  name!: string;

  @ApiProperty({ example: 'web' })
  guard_name!: string;

  @ApiPropertyOptional({ type: () => RoleResponseDto, isArray: true })
  roles?: RoleResponseDto[];

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  updated_at!: string;
}

export class RoleResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({
    example: '018f8de0-61ef-7c71-bf36-1513b7d6db46',
    nullable: true,
  })
  tenant_id!: string | null;

  @ApiProperty({ example: false })
  is_system!: boolean;

  @ApiProperty({ example: 'Sales Manager' })
  name!: string;

  @ApiProperty({ example: 'web' })
  guard_name!: string;

  @ApiPropertyOptional({ type: () => PermissionResponseDto, isArray: true })
  permissions?: PermissionResponseDto[];

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  updated_at!: string;
}

export class StoreRoleDto {
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  tenant_id?: string | null;

  @IsString()
  @MaxLength(125)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(125)
  guard_name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateRoleDto {
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  tenant_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(125)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(125)
  guard_name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class StorePermissionDto {
  @IsString()
  @MaxLength(125)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(125)
  guard_name?: string;
}

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(125)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(125)
  guard_name?: string;
}

export class SyncUserRolesDto {
  @IsArray()
  @IsString({ each: true })
  roles!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(125)
  guard_name?: string;
}

export class SyncUserPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(125)
  guard_name?: string;
}

export class RoleEnvelopeDto {
  @ApiProperty({ type: RoleResponseDto })
  data!: RoleResponseDto;
}

export class RoleListEnvelopeDto {
  @ApiProperty({ type: RoleResponseDto, isArray: true })
  data!: RoleResponseDto[];
}

export class PermissionEnvelopeDto {
  @ApiProperty({ type: PermissionResponseDto })
  data!: PermissionResponseDto;
}

export class PermissionListEnvelopeDto {
  @ApiProperty({ type: PermissionResponseDto, isArray: true })
  data!: PermissionResponseDto[];
}
