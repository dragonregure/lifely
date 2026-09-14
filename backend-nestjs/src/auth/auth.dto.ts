import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

type PasswordConfirmationPayload = {
  password?: string;
};

@ValidatorConstraint({ name: 'passwordConfirmationMatches', async: false })
class PasswordConfirmationMatchesConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    const dto = args.object as PasswordConfirmationPayload;
    return value === dto.password;
  }

  defaultMessage(): string {
    return 'password_confirmation must match password';
  }
}

export class RegisterDto {
  @ApiProperty({ example: 'Acme Realty' })
  @IsString()
  @MaxLength(180)
  tenant_name!: string;

  @ApiProperty({ example: 'Avery Admin' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'avery@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Secret123' })
  @IsString()
  @MinLength(8)
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a number' })
  password!: string;

  @ApiProperty({ example: 'Secret123' })
  @IsString()
  @Validate(PasswordConfirmationMatchesConstraint)
  password_confirmation!: string;

  @ApiPropertyOptional({ example: 'web' })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  device_name?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'avery@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Secret123' })
  @IsString()
  password!: string;

  @ApiPropertyOptional({ example: 'web' })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  device_name?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'plain-text-refresh-token' })
  @IsString()
  refresh_token!: string;

  @ApiPropertyOptional({ example: 'web' })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  device_name?: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ example: 'plain-text-refresh-token' })
  @IsString()
  @IsOptional()
  refresh_token?: string;
}

export class UpdatePasswordDto {
  @ApiProperty({ example: 'OldPassword12345' })
  @IsString()
  current_password!: string;

  @ApiProperty({ example: 'NewPassword12345' })
  @IsString()
  @MinLength(12)
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a number' })
  password!: string;

  @ApiProperty({ example: 'NewPassword12345' })
  @IsString()
  @Validate(PasswordConfirmationMatchesConstraint)
  password_confirmation!: string;
}

export class TenantSummaryDto {
  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  id!: string;

  @ApiProperty({ example: 'Acme Realty' })
  name!: string;

  @ApiPropertyOptional({ example: '2026-09-14T05:15:00.000Z' })
  created_at?: string;
}

export class AuthenticatedUserDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  tenant_id!: string;

  @ApiProperty({ example: 'office_admin' })
  role!: string;

  @ApiProperty({ example: ['office_admin'] })
  roles!: string[];

  @ApiProperty({ example: ['users.view'] })
  permissions!: string[];

  @ApiProperty({ example: 'Avery Admin' })
  name!: string;

  @ApiProperty({ example: 'avery@example.com' })
  email!: string;

  @ApiPropertyOptional({ type: TenantSummaryDto })
  tenant?: TenantSummaryDto;
}

export class AuthPayloadDto {
  @ApiProperty({ example: 'Bearer' })
  token_type!: 'Bearer';

  @ApiProperty({ example: 'plain-text-access-token' })
  access_token!: string;

  @ApiProperty({ example: '2026-09-14T06:15:00.000Z' })
  access_expires_at!: string;

  @ApiProperty({ example: 'plain-text-refresh-token' })
  refresh_token!: string;

  @ApiProperty({ example: '2026-10-14T05:15:00.000Z' })
  refresh_expires_at!: string;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthPayloadDto })
  data!: AuthPayloadDto;
}

export class MeResponseDto {
  @ApiProperty({
    type: AuthenticatedUserDto,
  })
  user!: AuthenticatedUserDto;
}

export class MeEnvelopeDto {
  @ApiProperty({ type: MeResponseDto })
  data!: MeResponseDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Logged out.' })
  message!: string;
}
