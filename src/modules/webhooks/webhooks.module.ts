import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { TelegramBotProvider } from '../providers/telegram/telegram.provider';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, TelegramBotProvider],
  exports: [WebhooksService],
})
export class WebhooksModule {}
