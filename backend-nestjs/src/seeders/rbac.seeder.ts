import { RbacRepository } from '../rbac/rbac.repository.js';
import { RbacService } from '../rbac/rbac.service.js';

export class RbacSeeder {
  constructor(
    private readonly rbacService = new RbacService(new RbacRepository()),
  ) {}

  async run(): Promise<void> {
    await this.rbacService.ensureDefaultRoles();
  }
}
