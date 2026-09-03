import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { Post } from '../post/post.type.js';

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

export class UserResponseDto {
    @Exclude()
    id!: number;

    @Expose()
    email!: string;

    @Expose()
    username!: string | null;
    
    @Expose()
    name!: string | null;

    @Expose()
    posts?: Post[];

    @Exclude()
    createdAt!: string;
}