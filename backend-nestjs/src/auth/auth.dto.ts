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

@ValidatorConstraint({ name: 'passwordConfirmationMatches', async: false })
class PasswordConfirmationMatchesConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    const dto = args.object as RegisterDto;
    return value === dto.password;
  }

  defaultMessage(): string {
    return 'password_confirmation must match password';
  }
}

export class RegisterDto {
  @IsString()
  @MaxLength(180)
  tenant_name!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a number' })
  password!: string;

  @IsString()
  @Validate(PasswordConfirmationMatchesConstraint)
  password_confirmation!: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  device_name?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  device_name?: string;
}
