import { Injectable } from '@nestjs/common';
import { User } from './user.type.js';
import { User as UserModel } from '../prisma/prisma.service.js';
import { CreateUserDto } from './user.dto.js';

@Injectable()
export class UserRepository {
    async findAll(includedRelations: string[] = []): Promise<User[]> {
        return await this.includeRelations(includedRelations).all();
    }

    findById(id: number, includedRelations: string[] = []): Promise<User | null> {
        return this.includeRelations(includedRelations).where({ id }).first();
    }

    findByEmail(email: string, includedRelations: string[] = []): Promise<User | null> {
        return this.includeRelations(includedRelations).where({ email }).first();
    }

    findByUsername(username: string, includedRelations: string[] = []): Promise<User | null> {
        return this.includeRelations(includedRelations).where({ username }).first();
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