import { Injectable } from '@nestjs/common';
import { User } from './user.type.js';
import { User as UserModel } from '../prisma/prisma.service.js';
import { CreateUserDto, UserResponseDto } from './user.dto.js';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserRepository {
    async findAll(includedRelations: string[] = []): Promise<UserResponseDto[]> {
        const users = await this.includeRelations(includedRelations).all();
        return users.map(user => plainToInstance(UserResponseDto, user));
    }

    async findById(id: number, includedRelations: string[] = []): Promise<UserResponseDto | null> {
        const user = await this.includeRelations(includedRelations).where({ id }).first();
        return user ? plainToInstance(UserResponseDto, user) : null;
    }

    async findByEmail(email: string, includedRelations: string[] = []): Promise<UserResponseDto | null> {
        const user = await this.includeRelations(includedRelations).where({ email }).first();
        return user ? plainToInstance(UserResponseDto, user) : null;
    }

    async findByUsername(username: string, includedRelations: string[] = []): Promise<UserResponseDto | null> {
        const user = await this.includeRelations(includedRelations).where({ username }).first();
        return user ? plainToInstance(UserResponseDto, user) : null;
    }

    create(user: CreateUserDto): Promise<User> {
        return UserModel.create(user);
    }

    private includeRelations(includedRelations: string[]) {
        let userModel = UserModel;
        
        if (includedRelations.includes('posts')) {
            userModel = userModel.include('posts');
        }

        return userModel;
    }
}