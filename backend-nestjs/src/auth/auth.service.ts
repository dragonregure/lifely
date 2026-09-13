import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { db } from '../prisma/db.js';
import { Roles } from '../rbac/rbac.constants.js';
import { RbacService } from '../rbac/rbac.service.js';
import { AuthenticatedUser, UserAccess } from '../rbac/rbac.types.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

type UserRecord = {
  id: string;
  tenantId: string;
  role: string;
  name: string;
  email: string;
  password: string;
  tenant?: {
    id: string;
    name: string;
    createdAt: string;
  };
};

type AuthPayload = {
  token_type: 'Bearer';
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly rbacService: RbacService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthPayload> {
    const existingUser = await db.orm.public.User.where({
      email: dto.email,
    }).first();

    if (existingUser) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    await this.rbacService.ensureDefaultRoles();

    const password = await this.passwordService.hash(dto.password);
    const user = await db.transaction(async (tx) => {
      const tenant = await tx.orm.public.Tenant.create({
        name: dto.tenant_name,
      });
      const createdUser = await tx.orm.public.User.create({
        tenantId: tenant.id,
        role: Roles.OFFICE_ADMIN,
        name: dto.name,
        email: dto.email,
        password,
        emailVerifiedAt: null,
      });

      return { ...createdUser, tenant };
    });

    await this.rbacService.assignRoleToUser(user.id, Roles.OFFICE_ADMIN);

    return this.tokenPayload(user, dto.device_name ?? 'api');
  }

  async login(dto: LoginDto): Promise<AuthPayload> {
    const user = (await db.orm.public.User.where({ email: dto.email })
      .include('tenant')
      .first()) as UserRecord | null;

    if (
      !user ||
      !(await this.passwordService.verify(dto.password, user.password))
    ) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.tokenPayload(user, dto.device_name ?? 'api');
  }

  async userFromAccessToken(
    plainTextToken: string,
  ): Promise<AuthenticatedUser | null> {
    const token = await this.tokenService.findValidToken(
      plainTextToken,
      'access',
    );

    if (!token) {
      return null;
    }

    const user = token.tokenable as unknown as UserRecord;
    const access = await this.rbacService.getUserAccess(user.id);
    return this.toAuthenticatedUser(user, access);
  }

  private async tokenPayload(
    user: UserRecord,
    deviceName: string,
  ): Promise<AuthPayload> {
    const [accessToken, refreshToken, access] = await Promise.all([
      this.tokenService.createToken(user.id, deviceName, 'access'),
      this.tokenService.createToken(user.id, deviceName, 'refresh'),
      this.rbacService.getUserAccess(user.id),
    ]);

    return {
      token_type: 'Bearer',
      access_token: accessToken.plainTextToken,
      access_expires_at: accessToken.expiresAt,
      refresh_token: refreshToken.plainTextToken,
      refresh_expires_at: refreshToken.expiresAt,
      user: this.toAuthenticatedUser(user, access),
    };
  }

  private toAuthenticatedUser(
    user: UserRecord,
    access: UserAccess,
  ): AuthenticatedUser {
    return {
      id: user.id,
      tenant_id: user.tenantId,
      role: user.role,
      roles: access.roles,
      permissions: this.rbacService.permissionNames(access),
      name: user.name,
      email: user.email,
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            created_at: user.tenant.createdAt,
          }
        : undefined,
    };
  }
}
