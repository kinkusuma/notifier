import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChannelType, NotificationStatus } from '@prisma/client';
import { DispatchService } from './dispatch.service';
import { DispatchNotificationDto } from './dto/dispatch-notification.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Notification Dispatch')
@ApiHeader({ name: 'x-api-key', description: 'API Key for authentication', required: false })
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('api/v1/notify')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Dispatch notification to a subscriber via template and channel',
    description: 'Enqueues notification to pg-boss queue, resolves user preference, renders template, and handles cross-channel fallback automatically.',
  })
  @ApiResponse({ status: 202, description: 'Notification accepted and queued for delivery' })
  async dispatch(@Body() dto: DispatchNotificationDto) {
    return this.dispatchService.dispatch(dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'List and filter notification audit logs' })
  @ApiQuery({ name: 'subscriberId', required: false })
  @ApiQuery({ name: 'templateSlug', required: false })
  @ApiQuery({ name: 'channel', enum: ChannelType, required: false })
  @ApiQuery({ name: 'status', enum: NotificationStatus, required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getLogs(
    @Query('subscriberId') subscriberId?: string,
    @Query('templateSlug') templateSlug?: string,
    @Query('channel') channel?: ChannelType,
    @Query('status') status?: NotificationStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.dispatchService.getLogs({
      subscriberId,
      templateSlug,
      channel,
      status,
      limit,
      offset,
    });
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get specific notification log with audit details and retry history' })
  async getLogById(@Param('id') id: string) {
    return this.dispatchService.getLogById(id);
  }
}
