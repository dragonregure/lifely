import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  @Get()
  @Redirect('/api/documentation', 302)
  @ApiExcludeEndpoint()
  redirectToDocumentation(): void {}
}
