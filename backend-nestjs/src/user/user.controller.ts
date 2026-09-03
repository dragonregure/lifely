import { Body, ClassSerializerInterceptor, Controller, Get, Param, ParseIntPipe, Post, UseInterceptors } from "@nestjs/common";
import { UserService } from "./user.service.js";
import { User } from "./user.type.js";
import { CreateUserDto, UserResponseDto } from "./user.dto.js";
import { ApiResponseInterceptor } from "../common/interceptors/api-response.interceptor.js";


@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseInterceptors(ApiResponseInterceptor)
  findAll(): Promise<UserResponseDto[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseInterceptors(ApiResponseInterceptor)
  findById(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.userService.findById(id);
  }

  @Post()
  @UseInterceptors(ApiResponseInterceptor)
  create(@Body() user: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(user);
  }
}