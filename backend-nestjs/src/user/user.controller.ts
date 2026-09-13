import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { ApiResponseInterceptor } from '../common/interceptors/api-response.interceptor.js';
import { RequirePermissions } from '../rbac/permissions.decorator.js';
import { Permissions } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';
import {
  UserEnvelopeDto,
  UserListEnvelopeDto,
  UserResponseDto,
} from './user.dto.js';
import { UserService } from './user.service.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('api/v1/users')
@UseGuards(AuthGuard, RbacGuard)
@RequirePermissions(Permissions.USERS_VIEW)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseInterceptors(ApiResponseInterceptor)
  @ApiOkResponse({ type: UserListEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  findAll(): Promise<UserResponseDto[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseInterceptors(ApiResponseInterceptor)
  @ApiOkResponse({ type: UserEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  findById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findById(id);
  }
}
