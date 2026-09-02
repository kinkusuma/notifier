import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType, Priority } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class DispatchNotificationDto {
  @ApiProperty({ description: 'Target subscriber external ID', example: 'usr_123456' })
  @IsString()
  @IsNotEmpty()
  subscriberExternalId: string;

  @ApiProperty({ description: 'Template slug to use', example: 'welcome-user' })
  @IsString()
  @IsNotEmpty()
  templateSlug: string;

  @ApiPropertyOptional({ enum: ChannelType, description: 'Override channel (defaults to template defaultChannel)', example: ChannelType.EMAIL })
  @IsEnum(ChannelType)
  @IsOptional()
  channel?: ChannelType;

  @ApiPropertyOptional({ description: 'Override provider (e.g. SMTP, RESEND, FONNTE, TWILIO)' })
  @IsString()
  @IsOptional()
  providerOverride?: string;

  @ApiPropertyOptional({ description: 'Override destination recipient directly' })
  @IsString()
  @IsOptional()
  recipientOverride?: string;

  @ApiPropertyOptional({ description: 'Template interpolation variables', example: { name: 'John Doe', appName: 'MyPlatform' } })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Category for user preference filtering (e.g. TRANSACTIONAL, MARKETING, SECURITY)', default: 'DEFAULT' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: Priority, description: 'Priority level (HIGH, NORMAL, LOW)', default: Priority.NORMAL })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Schedule notification for future ISO8601 date-time', example: '2026-09-03T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  sendAt?: string;

  @ApiPropertyOptional({ description: 'Delay notification dispatch by N seconds', example: 3600 })
  @IsNumber()
  @IsOptional()
  delaySeconds?: number;
}
