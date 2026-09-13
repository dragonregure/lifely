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
import { Request } from 'express';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { AuthGuard } from './auth.guard.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return {
      data: await this.authService.register(dto),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return {
      data: await this.authService.login(dto),
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: RequestWithUser) {
    return {
      data: {
        user: request.user,
      },
    };
  }
}
