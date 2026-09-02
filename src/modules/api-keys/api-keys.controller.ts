import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('API Keys Management')
@ApiHeader({ name: 'x-api-key', description: 'API Key for authentication', required: false })
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('api/v1/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({ status: 201, description: 'API Key created successfully' })
  async create(@Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  async findAll() {
    return this.apiKeysService.findAll();
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke / deactivate an API key' })
  async revoke(@Param('id') id: string) {
    return this.apiKeysService.revoke(id);
  }
}
