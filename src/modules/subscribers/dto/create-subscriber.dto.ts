import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSubscriberDto {
  @ApiProperty({ description: 'Unique external user ID in client system', example: 'usr_123456' })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiPropertyOptional({ description: 'Subscriber email address', example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Subscriber phone number (E.164 format)', example: '+628123456789' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Telegram chat ID', example: '987654321' })
  @IsString()
  @IsOptional()
  telegramChatId?: string;

  @ApiPropertyOptional({ description: 'Custom Webhook URL', example: 'https://webhook.site/xxx' })
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Firebase Cloud Messaging tokens', example: ['fcm_token_1'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fcmTokens?: string[];

  @ApiPropertyOptional({ description: 'Arbitrary custom metadata', example: { tier: 'pro', lang: 'id' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
