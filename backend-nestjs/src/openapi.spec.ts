import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module.js';
import { createOpenApiDocument } from './openapi.js';

describe('OpenAPI documentation', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('uses the Laravel API documentation metadata and path shape', () => {
    const document = createOpenApiDocument(app);

    expect(document.info).toMatchObject({
      title: 'Lifely API',
      version: '1.0.0',
    });
    expect(document.servers).toEqual([{ url: '/api/v1' }]);
    expect(document.security).toEqual([{ BearerAuth: [] }]);
    expect(document.components?.securitySchemes?.BearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'Sanctum token',
    });
    expect(Object.keys(document.paths)).not.toContain('/api/v1/auth/login');
    expect(document.paths['/auth/login']).toBeDefined();
  });

  it('documents current NestJS endpoints under Laravel-compatible tags', () => {
    const document = createOpenApiDocument(app);

    expect(document.tags?.map((tag) => tag.name)).toEqual([
      'Auth',
      'Tenant',
      'Contacts',
      'Access Control',
    ]);
    expect(document.paths['/tenant']?.get?.tags).toEqual(['Tenant']);
    expect(document.paths['/members']?.get?.tags).toEqual(['Tenant']);
    expect(document.paths['/contacts']?.get?.tags).toEqual(['Contacts']);
    expect(document.paths['/contacts']?.post?.tags).toEqual(['Contacts']);
    expect(document.paths['/me/permissions']?.get?.tags).toEqual([
      'Access Control',
    ]);
    expect(document.paths['/roles']?.get?.tags).toEqual(['Access Control']);
    expect(document.paths['/auth/me']?.get?.tags).toEqual(['Auth']);
  });

  it('does not publish Nest-only user lookup routes in Swagger', () => {
    const document = createOpenApiDocument(app);

    expect(document.tags?.map((tag) => tag.name)).not.toContain('Users');
    expect(document.paths['/users']).toBeUndefined();
    expect(document.paths['/users/{id}']).toBeUndefined();
  });
});
