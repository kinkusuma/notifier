import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class BroadcastNotificationDto {
  @ApiPropertyOptional({ description: 'Specific list of subscriber external IDs to target', example: ['usr_100', 'usr_101'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subscriberExternalIds?: string[];

  @ApiPropertyOptional({ description: 'Filter subscribers by metadata criteria', example: { tier: 'pro' } })
  @IsObject()
  @IsOptional()
  metadataFilter?: Record<string, any>;

  @ApiProperty({ description: 'Template slug to broadcast', example: 'welcome-user' })
  @IsString()
  @IsNotEmpty()
  templateSlug: string;

  @ApiPropertyOptional({ enum: ChannelType, description: 'Override default channel' })
  @IsEnum(ChannelType)
  @IsOptional()
  channel?: ChannelType;

  @ApiPropertyOptional({ description: 'Shared interpolation variables', example: { appName: 'Notifier Cloud' } })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Category for user preference filtering', default: 'DEFAULT' })
  @IsString()
  @IsOptional()
  category?: string;
}
