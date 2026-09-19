import { Injectable } from '@nestjs/common';
import { PasswordService } from '../auth/password.service.js';
import { Roles } from '../rbac/rbac.constants.js';
import { RbacService } from '../rbac/rbac.service.js';
import { SeederRepository } from './seeder.repository.js';

const DEMO_TENANT_ID = '0197066f-2aa2-73f8-93d1-56a73ad14220';
const DEMO_TENANT_NAME = 'Skyline Realty Office';
const DEMO_USER_EMAIL = 'maya@skyline.example';
const DEMO_USER_PASSWORD = 'password';

@Injectable()
export class BasicUserSeeder {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly rbacService: RbacService,
    private readonly seederRepository: SeederRepository,
  ) {}

  async run(): Promise<void> {
    const tenant = await this.findOrCreateTenant();
    const user = await this.findOrCreateDemoUser(tenant.id);

    await this.rbacService.assignRoleToUser(user.id, Roles.OFFICE_ADMIN);
  }

  private async findOrCreateTenant() {
    const existing = await this.seederRepository.findTenantById(DEMO_TENANT_ID);

    if (existing) {
      return existing;
    }

    return this.seederRepository.createTenant(DEMO_TENANT_ID, DEMO_TENANT_NAME);
  }

  private async findOrCreateDemoUser(tenantId: string) {
    const existing =
      await this.seederRepository.findUserByEmail(DEMO_USER_EMAIL);

    if (existing) {
      return existing;
    }

    return this.seederRepository.createUser({
      tenantId,
      role: Roles.OFFICE_ADMIN,
      name: 'Maya Hart',
      email: DEMO_USER_EMAIL,
      password: await this.passwordService.hash(DEMO_USER_PASSWORD),
    });
  }
}
