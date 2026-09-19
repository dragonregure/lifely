import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Roles } from '../rbac/rbac.constants.js';
import { RbacService } from '../rbac/rbac.service.js';
import { AuthenticatedUser, UserAccess } from '../rbac/rbac.types.js';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  UpdatePasswordDto,
} from './auth.dto.js';
import { AuthRepository, AuthUserRecord } from './auth.repository.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

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
    private readonly authRepository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly rbacService: RbacService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthPayload> {
    const existingUser = await this.authRepository.findUserByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }

    await this.rbacService.ensureDefaultRoles();

    const password = await this.passwordService.hash(dto.password);
    const user = await this.authRepository.createTenantOwner({
      tenantName: dto.tenant_name,
      role: Roles.OFFICE_ADMIN,
      name: dto.name,
      email: dto.email,
      password,
    });

    await this.rbacService.assignRoleToUser(user.id, Roles.OFFICE_ADMIN);

    return this.tokenPayload(user, dto.device_name ?? 'api');
  }

  async login(dto: LoginDto): Promise<AuthPayload> {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (
      !user ||
      !(await this.passwordService.verify(dto.password, user.password))
    ) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.tokenPayload(user, dto.device_name ?? 'api');
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthPayload> {
    const token = await this.tokenService.findValidToken(
      dto.refresh_token,
      'refresh',
    );

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = token.tokenable as AuthUserRecord;
    await this.tokenService.revokeTokenById(token.id, user.id, 'refresh');

    return this.tokenPayload(user, dto.device_name ?? 'api');
  }

  async logout(
    user: AuthenticatedUser,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    await this.tokenService.revokeToken(accessToken, {
      userId: user.id,
      ability: 'access',
    });

    if (refreshToken) {
      await this.tokenService.revokeToken(refreshToken, {
        userId: user.id,
        ability: 'refresh',
      });
    }
  }

  async revokeAll(user: AuthenticatedUser): Promise<void> {
    await this.tokenService.revokeAllForUser(user.id);
  }

  async updatePassword(
    user: AuthenticatedUser,
    dto: UpdatePasswordDto,
  ): Promise<void> {
    const userRecord = await this.authRepository.findUserById(user.id);

    if (
      !userRecord ||
      !(await this.passwordService.verify(
        dto.current_password,
        userRecord.password,
      ))
    ) {
      throw new UnprocessableEntityException('Current password is incorrect.');
    }

    await this.authRepository.updateUserPassword(
      user.id,
      await this.passwordService.hash(dto.password),
    );
    await this.tokenService.revokeAllForUser(user.id);
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

    const user = token.tokenable as AuthUserRecord;
    const access = await this.rbacService.getUserAccess(user.id);
    return this.toAuthenticatedUser(user, access);
  }

  private async tokenPayload(
    user: AuthUserRecord,
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
    user: AuthUserRecord,
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
