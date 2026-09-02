import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SetPreferenceDto {
  @ApiProperty({ description: 'Subscriber external ID or database ID', example: 'usr_123456' })
  @IsString()
  @IsNotEmpty()
  subscriberExternalId: string;

  @ApiProperty({ enum: ChannelType, description: 'Notification channel', example: ChannelType.EMAIL })
  @IsEnum(ChannelType)
  channel: ChannelType;

  @ApiPropertyOptional({ description: 'Notification category (e.g. DEFAULT, MARKETING, TRANSACTIONAL, SECURITY)', example: 'MARKETING', default: 'DEFAULT' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Opt-in (true) or opt-out (false)', example: true })
  @IsBoolean()
  isEnabled: boolean;
}
