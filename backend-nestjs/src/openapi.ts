import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const OPEN_API_DOCUMENTATION_PATH = 'api/documentation';
export const OPEN_API_JSON_PATH = 'api/docs';
const API_PREFIX = '/api/v1';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Lifely API')
    .setDescription(
      'API-first Laravel backend for the Lifely multi-tenant real estate CRM. Protected endpoints use Sanctum bearer tokens. Tenant context is resolved from the authenticated user by default; `X-Tenant-Id` and `tenant_id` are still accepted by the backend as compatibility overrides, but they are not an authentication mechanism and are not required for normal SPA/API clients.',
    )
    .setVersion('1.0.0')
    .addServer(API_PREFIX)
    .addTag(
      'Auth',
      'Registration, login, token rotation, and account session actions.',
    )
    .addTag('Tenant', 'Current office tenant and member context.')
    .addTag('Contacts', 'Tenant-scoped CRM contacts and leads.')
    .addTag('Listings', 'Tenant-scoped real estate listings.')
    .addTag('Leads', 'Tenant-scoped lead workflow.')
    .addTag('Access Control', 'Roles, permissions, and user access assignment.')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Sanctum token',
      },
      'BearerAuth',
    )
    .addSecurityRequirements('BearerAuth')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    autoTagControllers: false,
  });

  document.paths = Object.fromEntries(
    Object.entries(document.paths).map(([path, pathItem]) => [
      path.startsWith(API_PREFIX) ? path.slice(API_PREFIX.length) : path,
      pathItem,
    ]),
  );

  return document;
}

export function setupOpenApi(app: INestApplication): void {
  const document = createOpenApiDocument(app);

  SwaggerModule.setup(OPEN_API_DOCUMENTATION_PATH, app, document, {
    jsonDocumentUrl: OPEN_API_JSON_PATH,
    customSiteTitle: 'Lifely API Documentation',
  });
}
