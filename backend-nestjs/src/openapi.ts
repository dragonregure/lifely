import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const OPEN_API_DOCUMENTATION_PATH = 'api/documentation';
export const OPEN_API_JSON_PATH = 'api/docs';

export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Lifely NestJS API')
    .setDescription('Alternative NestJS API runtime for Lifely CRM.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(OPEN_API_DOCUMENTATION_PATH, app, document, {
    jsonDocumentUrl: OPEN_API_JSON_PATH,
    customSiteTitle: 'Lifely NestJS API Documentation',
  });
}
