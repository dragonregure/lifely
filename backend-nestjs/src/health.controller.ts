import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'lifely-api' })
  service!: string;
}

@ApiTags('System')
@Controller('api/v1/health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check', security: [] })
  @ApiOkResponse({
    description: 'Service is healthy.',
    type: HealthResponseDto,
  })
  show(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'lifely-api',
    };
  }
}
