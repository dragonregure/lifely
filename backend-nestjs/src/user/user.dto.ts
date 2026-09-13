import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '018f8de0-6503-7c71-8a83-85f895c7d2d3' })
  id!: string;

  @ApiProperty({ example: '018f8de0-61ef-7c71-bf36-1513b7d6db46' })
  tenant_id!: string;

  @ApiProperty({ example: 'office_admin' })
  role!: string;

  @ApiProperty({ example: 'Avery Admin' })
  name!: string;

  @ApiProperty({ example: 'avery@example.com' })
  email!: string;

  @ApiProperty({ example: '2026-09-14T05:15:00.000Z' })
  created_at!: string;
}

export class UserEnvelopeDto {
  @ApiProperty({ type: UserResponseDto })
  data!: UserResponseDto;

  @ApiProperty({ example: 'Success' })
  message!: string;
}

export class UserListEnvelopeDto {
  @ApiProperty({ type: UserResponseDto, isArray: true })
  data!: UserResponseDto[];

  @ApiProperty({ example: 'Success' })
  message!: string;
}
