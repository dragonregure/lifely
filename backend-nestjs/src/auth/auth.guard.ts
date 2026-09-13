import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service.js';
import { AuthenticatedUser } from '../rbac/rbac.types.js';

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.bearerToken(request);

    if (!token) {
      return false;
    }

    const user = await this.authService.userFromAccessToken(token);

    if (!user) {
      return false;
    }

    request.user = user;
    return true;
  }

  private bearerToken(request: Request): string | null {
    const authorization = request.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    return authorization.slice('Bearer '.length).trim();
  }
}
