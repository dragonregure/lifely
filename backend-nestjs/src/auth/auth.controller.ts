import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { AuthGuard } from './auth.guard.js';
import {
  AuthResponseDto,
  LoginDto,
  MeEnvelopeDto,
  MessageResponseDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  UpdatePasswordDto,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
  accessToken: string;
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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token and issue a new access token',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token.' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return {
      data: await this.authService.refresh(dto),
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

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current access token' })
  @ApiBody({ type: LogoutDto, required: false })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async logout(@Req() request: RequestWithUser, @Body() dto?: LogoutDto) {
    await this.authService.logout(
      request.user,
      request.accessToken,
      dto?.refresh_token,
    );

    return {
      message: 'Logged out.',
    };
  }

  @Post('revoke-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all tokens for the current user' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async revokeAll(@Req() request: RequestWithUser) {
    await this.authService.revokeAll(request.user);

    return {
      message: 'All tokens revoked.',
    };
  }

  @Put('password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update password and revoke all tokens' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed or current password is incorrect.',
  })
  async updatePassword(
    @Req() request: RequestWithUser,
    @Body() dto: UpdatePasswordDto,
  ) {
    await this.authService.updatePassword(request.user, dto);

    return {
      message: 'Password updated. Sign in again with the new password.',
    };
  }
}
