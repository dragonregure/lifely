import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jest } from '@jest/globals';
import { PERMISSIONS_KEY } from './permissions.decorator.js';
import { Permissions } from './rbac.constants.js';
import { RbacGuard } from './rbac.guard.js';

const contextWithUser = (
  user: { permissions: string[] } | undefined,
): ExecutionContext =>
  ({
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('RbacGuard', () => {
  it('allows users with the required permission', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permissions.USERS_VIEW]);

    const guard = new RbacGuard(reflector);

    expect(
      guard.canActivate(
        contextWithUser({ permissions: [Permissions.USERS_VIEW] }),
      ),
    ).toBe(true);
  });

  it('allows system bypass to satisfy any required permission', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permissions.USERS_ASSIGN_ROLES]);

    const guard = new RbacGuard(reflector);

    expect(
      guard.canActivate(
        contextWithUser({ permissions: [Permissions.SYSTEM_BYPASS] }),
      ),
    ).toBe(true);
  });

  it('denies users missing a required permission', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      expect(key).toBe(PERMISSIONS_KEY);
      return [Permissions.USERS_VIEW];
    });

    const guard = new RbacGuard(reflector);

    expect(guard.canActivate(contextWithUser({ permissions: [] }))).toBe(false);
  });
});
