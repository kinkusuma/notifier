import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Name or description of the client using this key', example: 'Payment Microservice' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Optional specific custom key (will auto-generate if empty)', example: 'notif_live_9988776655' })
  @IsString()
  @IsOptional()
  key?: string;
}
