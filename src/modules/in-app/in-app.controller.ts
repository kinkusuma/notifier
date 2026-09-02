import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { InAppService } from './in-app.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('In-App Notifications Feed')
@ApiHeader({ name: 'x-api-key', description: 'API Key for authentication', required: false })
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('api/v1/in-app')
export class InAppController {
  constructor(private readonly inAppService: InAppService) {}

  @Get('notifications/:subscriberExternalId')
  @ApiOperation({ summary: 'Get in-app notification feed for a subscriber' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getNotifications(
    @Param('subscriberExternalId') subscriberExternalId: string,
    @Query('isRead') isRead?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.inAppService.getNotifications(subscriberExternalId, { isRead, limit, offset });
  }

  @Get('unread-count/:subscriberExternalId')
  @ApiOperation({ summary: 'Get unread notification count for a subscriber' })
  async getUnreadCount(@Param('subscriberExternalId') subscriberExternalId: string) {
    return this.inAppService.getUnreadCount(subscriberExternalId);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markAsRead(@Param('id') id: string) {
    return this.inAppService.markAsRead(id);
  }

  @Patch('notifications/read-all/:subscriberExternalId')
  @ApiOperation({ summary: 'Mark all notifications as read for a subscriber' })
  async markAllAsRead(@Param('subscriberExternalId') subscriberExternalId: string) {
    return this.inAppService.markAllAsRead(subscriberExternalId);
  }

  @Sse('stream/:subscriberExternalId')
  @ApiOperation({ summary: 'Server-Sent Events (SSE) realtime push stream for subscriber notifications' })
  stream(@Param('subscriberExternalId') subscriberExternalId: string): Observable<{ data: any }> {
    return this.inAppService.subscribeToStream(subscriberExternalId);
  }
}
