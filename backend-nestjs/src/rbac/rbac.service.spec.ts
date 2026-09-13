import { Permissions } from './rbac.constants.js';
import { RbacRepository } from './rbac.repository.js';
import { RbacService } from './rbac.service.js';

describe('RbacService', () => {
  let service: RbacService;

  beforeEach(() => {
    service = new RbacService({} as RbacRepository);
  });

  it('deduplicates direct and role permissions', () => {
    const permissions = service.permissionNames({
      roles: ['Office Admin'],
      directPermissions: [Permissions.USERS_VIEW, Permissions.USERS_VIEW],
      rolePermissions: [Permissions.USERS_VIEW, Permissions.ROLES_VIEW],
    });

    expect(permissions).toEqual([
      Permissions.USERS_VIEW,
      Permissions.ROLES_VIEW,
    ]);
  });

  it('allows system bypass to satisfy any permission', () => {
    const canManageReports = service.can(
      {
        roles: ['System Admin'],
        directPermissions: [Permissions.SYSTEM_BYPASS],
        rolePermissions: [],
      },
      Permissions.REPORTS_VIEW,
    );

    expect(canManageReports).toBe(true);
  });
});
