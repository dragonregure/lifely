import { Injectable } from '@nestjs/common';
import { User as UserModel } from '../prisma/prisma.service.js';
import { UserResponseDto } from './user.dto.js';
import { User } from './user.type.js';

@Injectable()
export class UserRepository {
  async findAll(): Promise<UserResponseDto[]> {
    const users = await UserModel.all();
    return users.map((user) => this.toResponse(user));
  }

  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await UserModel.where({ id }).first();
    return user ? this.toResponse(user) : null;
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await UserModel.where({ email }).first();
    return user ? this.toResponse(user) : null;
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
      name: user.name,
      email: user.email,
      created_at: user.createdAt,
    };
  }
}
