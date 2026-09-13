import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { AuthGuard } from './auth.guard.js';
import {
  AuthResponseDto,
  LoginDto,
  MeEnvelopeDto,
  RegisterDto,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(@Body() dto: RegisterDto) {
    return {
      data: await this.authService.register(dto),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto) {
    return {
      data: await this.authService.login(dto),
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: MeEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  me(@Req() request: RequestWithUser) {
    return {
      data: {
        user: request.user,
      },
    };
  }
}
