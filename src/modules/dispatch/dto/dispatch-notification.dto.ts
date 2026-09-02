import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType, Priority } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Override destination recipient directly (e.g. custom email or number)' })
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
}
