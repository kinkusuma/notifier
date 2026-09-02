import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { SetPreferenceDto } from './dto/set-preference.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('User Preferences')
@ApiHeader({ name: 'x-api-key', description: 'API Key for authentication', required: false })
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
@Controller('api/v1/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Post()
  @ApiOperation({ summary: 'Set or update user channel preference (opt-in / opt-out)' })
  @ApiResponse({ status: 200, description: 'Preference saved successfully' })
  async setPreference(@Body() dto: SetPreferenceDto) {
    return this.preferencesService.setPreference(dto);
  }

  @Get('subscriber/:externalId')
  @ApiOperation({ summary: 'Get all preferences for a subscriber by external ID' })
  async getSubscriberPreferences(@Param('externalId') externalId: string) {
    return this.preferencesService.getSubscriberPreferences(externalId);
  }
}
