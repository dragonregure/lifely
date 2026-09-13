import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { setupOpenApi } from './../src/openapi.js';

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
          paths: Record<string, unknown>;
        };

        expect(body.openapi).toMatch(/^3\./);
        expect(body.info.title).toBe('Lifely NestJS API');
        expect(body.paths).toHaveProperty('/api/v1/auth/login');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
