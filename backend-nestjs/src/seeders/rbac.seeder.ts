import { Injectable } from '@nestjs/common';
import { RbacService } from '../rbac/rbac.service.js';

@Injectable()
export class RbacSeeder {
  constructor(private readonly rbacService: RbacService) {}

  async run(): Promise<void> {
    await this.rbacService.ensureDefaultRoles();
  }
}
