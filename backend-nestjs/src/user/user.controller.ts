import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { ApiResponseInterceptor } from '../common/interceptors/api-response.interceptor.js';
import { RequirePermissions } from '../rbac/permissions.decorator.js';
import { Permissions } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import { UserResponseDto } from './user.dto.js';
import { UserService } from './user.service.js';

@Controller('api/v1/users')
@UseGuards(AuthGuard, RbacGuard)
@RequirePermissions(Permissions.USERS_VIEW)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseInterceptors(ApiResponseInterceptor)
  findAll(): Promise<UserResponseDto[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseInterceptors(ApiResponseInterceptor)
  findById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findById(id);
  }
}
