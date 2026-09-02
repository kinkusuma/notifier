import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
}
