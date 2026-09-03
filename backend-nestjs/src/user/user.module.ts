import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';

@Module({
    controllers: [UserController],
    providers: [PrismaService, UserRepository, UserService],
})
export class UserModule {};