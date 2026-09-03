import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { UserService } from "./user.service.js";
import { User } from "./user.type.js";
import { CreateUserDto } from "./user.dto.js";


@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.userService.findById(id);
  }

  @Post()
  create(@Body() user: CreateUserDto): Promise<User> {
    return this.userService.create(user);
  }
}