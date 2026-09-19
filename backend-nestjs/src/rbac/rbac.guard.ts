import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from './permissions.decorator.js';
import { Permissions } from './rbac.constants.js';
import { AuthenticatedUser } from './rbac.types.js';

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return false;
    }

    return (
      user.permissions.includes(Permissions.SYSTEM_BYPASS) ||
      requiredPermissions.every((permission) =>
        user.permissions.includes(permission),
      )
    );
  }
}
