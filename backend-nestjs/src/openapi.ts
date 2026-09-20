import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const OPEN_API_DOCUMENTATION_PATH = 'api/documentation';
export const OPEN_API_JSON_PATH = 'api/docs';
export const OPEN_API_SWAGGER_UI_OPTIONS = {
  docExpansion: 'none',
};
const API_PREFIX = '/api/v1';
const SWAGGER_UI_DIST_VERSION = '5.32.13';

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
    ui: false,
    jsonDocumentUrl: OPEN_API_JSON_PATH,
    swaggerOptions: OPEN_API_SWAGGER_UI_OPTIONS,
  });

  const httpAdapter = app.getHttpAdapter();
  const documentationPath = `/${OPEN_API_DOCUMENTATION_PATH}`;

  httpAdapter.get(documentationPath, (_request, response) => {
    response.type('text/html').send(openApiDocumentationHtml());
  });

  httpAdapter.get(`${documentationPath}/`, (_request, response) => {
    response.type('text/html').send(openApiDocumentationHtml());
  });
}

function openApiDocumentationHtml(): string {
  const assetBase = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_DIST_VERSION}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lifely API Documentation</title>
    <link rel="stylesheet" href="${assetBase}/swagger-ui.css">
    <style>
      html { box-sizing: border-box; overflow-y: scroll; }
      *, *::before, *::after { box-sizing: inherit; }
      body { margin: 0; background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${assetBase}/swagger-ui-bundle.js"></script>
    <script src="${assetBase}/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: "/${OPEN_API_JSON_PATH}",
          dom_id: "#swagger-ui",
          deepLinking: true,
          docExpansion: "${OPEN_API_SWAGGER_UI_OPTIONS.docExpansion}",
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout"
        });
      };
    </script>
  </body>
</html>`;
}
