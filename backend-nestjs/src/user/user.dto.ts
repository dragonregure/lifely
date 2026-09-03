import { IsEmail, IsString, IsOptional } from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email!: string;

    @IsString()
    @IsOptional()
    username?: string | null;

    @IsString()
    @IsOptional()
    name?: string | null;
}