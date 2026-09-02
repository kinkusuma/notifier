import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { WebhooksService } from './webhooks.service';

@ApiTags('Inbound Delivery Webhooks')
@Controller('api/v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('resend')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inbound webhook endpoint for Resend email events (delivered, opened, clicked, bounced)' })
  @ApiResponse({ status: 200, description: 'Event processed' })
  async resend(@Body() payload: any) {
    return this.webhooksService.handleResendWebhook(payload);
  }

  @Post('twilio')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inbound webhook endpoint for Twilio WhatsApp/SMS status callbacks' })
  @ApiResponse({ status: 200, description: 'Event processed' })
  async twilio(@Body() payload: any) {
    return this.webhooksService.handleTwilioWebhook(payload);
  }

  @Post('fonnte')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inbound webhook endpoint for Fonnte WhatsApp delivery callbacks' })
  @ApiResponse({ status: 200, description: 'Event processed' })
  async fonnte(@Body() payload: any) {
    return this.webhooksService.handleFonnteWebhook(payload);
  }

  @Post('telegram')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inbound webhook endpoint for Telegram Bot updates (handles /start <subscriberExternalId> Magic Connect)' })
  @ApiResponse({ status: 200, description: 'Event processed' })
  async telegram(@Body() payload: any) {
    return this.webhooksService.handleTelegramWebhook(payload);
  }

  @Get('telegram/connect-url/:subscriberExternalId')
  @Public()
  @ApiOperation({ summary: 'Get 1-click Magic Connect URL for a subscriber to link their Telegram account' })
  getTelegramConnectUrl(@Param('subscriberExternalId') subscriberExternalId: string) {
    const url = this.webhooksService.getTelegramConnectUrl(subscriberExternalId);
    return { subscriberExternalId, connectUrl: url };
  }
}
