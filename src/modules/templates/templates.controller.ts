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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Templates')
@ApiHeader({ name: 'x-api-key', description: 'API Key for authentication', required: false })
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('api/v1/templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a notification template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  async findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  async findById(@Param('id') id: string) {
    return this.templatesService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get template by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.templatesService.findBySlug(slug);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template by ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template by ID' })
  async delete(@Param('id') id: string) {
    await this.templatesService.delete(id);
  }
}
