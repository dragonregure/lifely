import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const OPEN_API_DOCUMENTATION_PATH = 'api/documentation';
export const OPEN_API_JSON_PATH = 'api/docs';
export const OPEN_API_SWAGGER_UI_OPTIONS = {
  docExpansion: 'none',
};
const API_PREFIX = '/api/v1';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Lifely API')
    .setDescription(
      'API-first Laravel backend for the Lifely multi-tenant real estate CRM. Protected endpoints use Sanctum bearer tokens. Tenant context is resolved from the authenticated user by default; `X-Tenant-Id` and `tenant_id` are still accepted by the backend as compatibility overrides, but they are not an authentication mechanism and are not required for normal SPA/API clients.',
    )
    .setVersion('1.0.0')
    .addServer(API_PREFIX)
    .addTag('System', 'Health and operational endpoints.')
    .addTag(
      'Auth',
      'Registration, login, token rotation, and account session actions.',
    )
    .addTag('Tenant', 'Current office tenant and member context.')
    .addTag('Access Control', 'Roles, permissions, and user access assignment.')
    .addTag('Dashboard', 'CRM summary and reporting data.')
    .addTag(
      'Reporting',
      'CRM-backed operational reports and audited CSV exports.',
    )
    .addTag('Contacts', 'Tenant-scoped CRM contacts and leads.')
    .addTag('Listings', 'Tenant-scoped property inventory.')
    .addTag('Leads', 'Tenant-scoped lead workflow.')
    .addTag('Email Campaigns', 'Tenant-scoped bulk email campaigns.')
    .addTag('References', 'System and tenant reference values.')
    .addTag('Activity Logs', 'Tenant-scoped audit activity.')
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
    swaggerOptions: OPEN_API_SWAGGER_UI_OPTIONS,
  });
}
