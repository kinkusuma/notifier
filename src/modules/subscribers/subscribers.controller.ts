import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Subscribers')
@ApiHeader({ name: 'x-api-key', description: 'API Key for authentication', required: false })
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('api/v1/subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post()
  @ApiOperation({ summary: 'Create or register a new subscriber' })
  @ApiResponse({ status: 201, description: 'Subscriber created successfully' })
  async create(@Body() dto: CreateSubscriberDto) {
    return this.subscribersService.create(dto);
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert a subscriber by externalId' })
  @ApiResponse({ status: 200, description: 'Subscriber upserted successfully' })
  async upsert(@Body() dto: CreateSubscriberDto) {
    return this.subscribersService.upsert(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscribers' })
  async findAll() {
    return this.subscribersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscriber by ID' })
  async findById(@Param('id') id: string) {
    return this.subscribersService.findById(id);
  }

  @Get('external/:externalId')
  @ApiOperation({ summary: 'Get subscriber by external ID' })
  async findByExternalId(@Param('externalId') externalId: string) {
    return this.subscribersService.findByExternalId(externalId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscriber by ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateSubscriberDto) {
    return this.subscribersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete subscriber by ID' })
  async delete(@Param('id') id: string) {
    await this.subscribersService.delete(id);
  }
}
