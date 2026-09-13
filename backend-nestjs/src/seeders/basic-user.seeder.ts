import { PasswordService } from '../auth/password.service.js';
import { db } from '../prisma/db.js';
import { Roles } from '../rbac/rbac.constants.js';
import { RbacRepository } from '../rbac/rbac.repository.js';
import { RbacService } from '../rbac/rbac.service.js';

const DEMO_TENANT_ID = '0197066f-2aa2-73f8-93d1-56a73ad14220';
const DEMO_TENANT_NAME = 'Skyline Realty Office';
const DEMO_USER_EMAIL = 'maya@skyline.example';
const DEMO_USER_PASSWORD = 'password';

export class BasicUserSeeder {
  constructor(
    private readonly passwordService = new PasswordService(),
    private readonly rbacService = new RbacService(new RbacRepository()),
  ) {}

  async run(): Promise<void> {
    const tenant = await this.findOrCreateTenant();
    const user = await this.findOrCreateDemoUser(tenant.id);

    await this.rbacService.assignRoleToUser(user.id, Roles.OFFICE_ADMIN);
  }

  private async findOrCreateTenant() {
    const existing = await db.orm.public.Tenant.where({
      id: DEMO_TENANT_ID,
    }).first();

    if (existing) {
      return existing;
    }

    return db.orm.public.Tenant.create({
      id: DEMO_TENANT_ID,
      name: DEMO_TENANT_NAME,
    });
  }

  private async findOrCreateDemoUser(tenantId: string) {
    const existing = await db.orm.public.User.where({
      email: DEMO_USER_EMAIL,
    }).first();

    if (existing) {
      return existing;
    }

    return db.orm.public.User.create({
      tenantId,
      role: Roles.OFFICE_ADMIN,
      name: 'Maya Hart',
      email: DEMO_USER_EMAIL,
      password: await this.passwordService.hash(DEMO_USER_PASSWORD),
      emailVerifiedAt: null,
    });
  }
}
