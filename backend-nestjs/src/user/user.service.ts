import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "./user.repository.js";
import { User } from "./user.type.js";
import { CreateUserDto } from "./user.dto.js";


@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  findAll(includedRelations: string[] = []): Promise<User[]> {
    return this.userRepository.findAll(includedRelations);
  }

  async findById(id: number, includedRelations: string[] = []): Promise<User> {
    const user = await this.userRepository.findById(id, includedRelations);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string, includedRelations: string[] = []): Promise<User> {
    const user = await this.userRepository.findByEmail(email, includedRelations);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async create(user: CreateUserDto): Promise<User> {
    if (await this.userRepository.findByEmail(user.email)) {
      throw new ConflictException(`User with email ${user.email} already exists`);
    }

    return this.userRepository.create(user);
  }
}