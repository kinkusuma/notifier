import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Unique slug for template identifier', example: 'welcome-user' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'Display title of the template', example: 'Welcome Notification' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Email subject template with {{handlebars}} support', example: 'Welcome to {{appName}}, {{name}}!' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ description: 'Plaintext body template (SMS/WhatsApp/Telegram)', example: 'Hi {{name}}, welcome to {{appName}}! Your account is ready.' })
  @IsString()
  @IsNotEmpty()
  bodyText: string;

  @ApiPropertyOptional({ description: 'HTML body template for Email', example: '<h1>Hi {{name}}</h1><p>Welcome to <b>{{appName}}</b>!</p>' })
  @IsString()
  @IsOptional()
  bodyHtml?: string;

  @ApiProperty({ enum: ChannelType, description: 'Default channel for this template', example: ChannelType.EMAIL })
  @IsEnum(ChannelType)
  defaultChannel: ChannelType;

  @ApiPropertyOptional({ enum: ChannelType, description: 'Optional fallback channel if default channel delivery fails', example: ChannelType.TELEGRAM })
  @IsEnum(ChannelType)
  @IsOptional()
  fallbackChannel?: ChannelType;

  @ApiPropertyOptional({ description: 'Custom template metadata', example: { category: 'TRANSACTIONAL' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
