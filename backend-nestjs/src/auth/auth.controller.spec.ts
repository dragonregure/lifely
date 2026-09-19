/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import {
  INestApplication,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthenticatedUser } from '../rbac/rbac.types.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  UpdatePasswordDto,
} from './auth.dto.js';

const authenticatedUser: AuthenticatedUser = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  role: 'Office Admin',
  roles: ['Office Admin'],
  permissions: ['users.view', 'tenant.view'],
  name: 'Maya Admin',
  email: 'maya@example.com',
  tenant: {
    id: 'tenant-1',
    name: 'Skyline Realty',
    created_at: '2026-09-14T05:15:00.000Z',
  },
};

type AuthPayload = {
  token_type: 'Bearer';
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  user: AuthenticatedUser;
};

class FakeAuthService {
  logoutCall?: {
    user: AuthenticatedUser;
    accessToken: string;
    refreshToken?: string;
  };

  revokedUser?: AuthenticatedUser;
  passwordUpdate?: {
    user: AuthenticatedUser;
    dto: UpdatePasswordDto;
  };

  register(dto: RegisterDto): Promise<AuthPayload> {
    return Promise.resolve(
      this.payload({
        accessToken: `access:${dto.email}`,
        refreshToken: `refresh:${dto.email}`,
        user: {
          ...authenticatedUser,
          name: dto.name,
          email: dto.email,
          tenant: {
            id: 'tenant-new',
            name: dto.tenant_name,
            created_at: '2026-09-14T05:15:00.000Z',
          },
        },
      }),
    );
  }

  login(dto: LoginDto): Promise<AuthPayload> {
    if (dto.password !== 'password') {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return Promise.resolve(
      this.payload({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );
  }

  refresh(dto: RefreshTokenDto): Promise<AuthPayload> {
    if (dto.refresh_token === 'access-token') {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return Promise.resolve(
      this.payload({
        accessToken: 'rotated-access-token',
        refreshToken: 'rotated-refresh-token',
      }),
    );
  }

  logout(
    user: AuthenticatedUser,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    this.logoutCall = { user, accessToken, refreshToken };
    return Promise.resolve();
  }

  revokeAll(user: AuthenticatedUser): Promise<void> {
    this.revokedUser = user;
    return Promise.resolve();
  }

  updatePassword(
    user: AuthenticatedUser,
    dto: UpdatePasswordDto,
  ): Promise<void> {
    if (dto.current_password !== 'OldPassword12345') {
      throw new UnprocessableEntityException('Current password is incorrect.');
    }

    this.passwordUpdate = { user, dto };
    return Promise.resolve();
  }

  private payload(overrides: {
    accessToken: string;
    refreshToken: string;
    user?: AuthenticatedUser;
  }): AuthPayload {
    return {
      token_type: 'Bearer',
      access_token: overrides.accessToken,
      access_expires_at: '2026-09-14T06:15:00.000Z',
      refresh_token: overrides.refreshToken,
      refresh_expires_at: '2026-10-14T05:15:00.000Z',
      user: overrides.user ?? authenticatedUser,
    };
  }
}

describe('AuthController API', () => {
  let app: INestApplication<App>;
  let authService: FakeAuthService;

  beforeEach(async () => {
    authService = new FakeAuthService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              user: AuthenticatedUser;
              accessToken: string;
            };
          };
        }) => {
          const request = context.switchToHttp().getRequest();
          request.user = authenticatedUser;
          request.accessToken = 'access-token';
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers a user and returns bearer tokens like the Laravel API', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/auth/register')
      .send({
        tenant_name: 'Northstar Realty',
        name: 'Avery Stone',
        email: 'avery@example.com',
        password: 'Password12345',
        password_confirmation: 'Password12345',
        device_name: 'test-suite',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: {
            token_type: 'Bearer',
            access_token: 'access:avery@example.com',
            refresh_token: 'refresh:avery@example.com',
            user: {
              tenant_id: 'tenant-1',
              role: 'Office Admin',
              name: 'Avery Stone',
              email: 'avery@example.com',
            },
          },
        });
        expect(response.body.data.access_expires_at).toBeDefined();
        expect(response.body.data.refresh_expires_at).toBeDefined();
      });
  });

  it('logs in, refreshes, reads the current user, and logs out', async () => {
    const server = app.getHttpServer() as unknown as App;

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'maya@example.com',
        password: 'password',
        device_name: 'test-suite',
      })
      .expect(200);

    const refreshToken = login.body.data.refresh_token as string;

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({
        refresh_token: refreshToken,
        device_name: 'test-suite',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.data.refresh_token).not.toBe(refreshToken);
      });

    await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer access-token')
      .expect(200)
      .expect((response) => {
        expect(response.body.data.user.email).toBe('maya@example.com');
      });

    await request(server)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer access-token')
      .expect(200)
      .expect({ message: 'Logged out.' });
  });

  it('rejects access tokens submitted to refresh', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .post('/api/v1/auth/refresh')
      .send({
        refresh_token: 'access-token',
        device_name: 'test-suite',
      })
      .expect(401);
  });

  it('logs out the current access token and supplied refresh token', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer access-token')
      .send({
        refresh_token: 'refresh-token',
      })
      .expect(200)
      .expect({ message: 'Logged out.' });

    expect(authService.logoutCall).toEqual({
      user: authenticatedUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('revokes all tokens for the authenticated user', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .post('/api/v1/auth/revoke-all')
      .set('Authorization', 'Bearer access-token')
      .expect(200)
      .expect({ message: 'All tokens revoked.' });

    expect(authService.revokedUser).toEqual(authenticatedUser);
  });

  it('updates the password and returns the Laravel-compatible message', async () => {
    const server = app.getHttpServer() as unknown as App;

    await request(server)
      .put('/api/v1/auth/password')
      .set('Authorization', 'Bearer access-token')
      .send({
        current_password: 'OldPassword12345',
        password: 'NewPassword12345',
        password_confirmation: 'NewPassword12345',
      })
      .expect(200)
      .expect({
        message: 'Password updated. Sign in again with the new password.',
      });

    expect(authService.passwordUpdate).toMatchObject({
      user: authenticatedUser,
      dto: {
        current_password: 'OldPassword12345',
        password: 'NewPassword12345',
        password_confirmation: 'NewPassword12345',
      },
    });
  });

  it('rejects an incorrect current password without updating the password', () => {
    const server = app.getHttpServer() as unknown as App;

    return request(server)
      .put('/api/v1/auth/password')
      .set('Authorization', 'Bearer access-token')
      .send({
        current_password: 'WrongPassword12345',
        password: 'NewPassword12345',
        password_confirmation: 'NewPassword12345',
      })
      .expect(422)
      .expect((response) => {
        expect(response.body.message).toBe('Current password is incorrect.');
        expect(authService.passwordUpdate).toBeUndefined();
      });
  });
});
