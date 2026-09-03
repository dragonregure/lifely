import { Body, Controller, Get, Param, ParseIntPipe, Post, UseInterceptors } from "@nestjs/common";
import { UserService } from "./user.service.js";
import { User } from "./user.type.js";
import { CreateUserDto } from "./user.dto.js";
import { ApiResponseInterceptor } from "../common/interceptors/api-response.interceptor.js";


@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseInterceptors(ApiResponseInterceptor)
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseInterceptors(ApiResponseInterceptor)
  findById(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.userService.findById(id);
  }

  @Post()
  @UseInterceptors(ApiResponseInterceptor)
  create(@Body() user: CreateUserDto): Promise<User> {
    return this.userService.create(user);
  }
}