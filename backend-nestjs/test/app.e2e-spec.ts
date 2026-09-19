import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { setupOpenApi } from './../src/openapi.js';

type OpenApiOperation = {
  summary?: string;
  requestBody?: {
    required?: boolean;
  };
  responses?: Record<string, unknown>;
};

type OpenApiPath = {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupOpenApi(app);
    await app.init();
  });

  it('/ (GET) redirects to API documentation', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const server = app.getHttpServer() as unknown as App;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(server)
      .get('/')
      .expect(302)
      .expect('Location', '/api/documentation');
  });

  it('/api/documentation (GET) serves Swagger UI', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const server = app.getHttpServer() as unknown as App;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(server).get('/api/documentation').expect(200);
  });

  it('/api/docs (GET) serves the OpenAPI document', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const server = app.getHttpServer() as unknown as App;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(server)
      .get('/api/docs')
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          openapi: string;
          info: { title: string };
          paths: Record<string, OpenApiPath>;
        };

        expect(body.openapi).toMatch(/^3\./);
        expect(body.info.title).toBe('Lifely NestJS API');
        expect(body.paths).toHaveProperty('/api/v1/auth/login');
        expect(body.paths['/api/v1/auth/refresh'].post.summary).toBe(
          'Rotate refresh token and issue a new access token',
        );
        expect(body.paths['/api/v1/auth/logout'].post.summary).toBe(
          'Revoke the current access token',
        );
        expect(
          body.paths['/api/v1/auth/logout'].post.requestBody.required,
        ).toBe(false);
        expect(body.paths['/api/v1/auth/revoke-all'].post.summary).toBe(
          'Revoke all tokens for the current user',
        );
        expect(body.paths['/api/v1/auth/password'].put.summary).toBe(
          'Update password and revoke all tokens',
        );
        expect(
          body.paths['/api/v1/auth/password'].put.responses,
        ).toHaveProperty('422');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
