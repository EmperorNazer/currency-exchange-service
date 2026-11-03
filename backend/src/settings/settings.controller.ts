import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CalculationParamsDto } from './dto/calculation-params.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить сохранённые настройки текущего пользователя' })
  getMySettings(@CurrentUser('id') userId: string) {
    return this.settingsService.getOrCreateByUserId(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Сохранить настройки текущего пользователя' })
  updateMySettings(
    @CurrentUser('id') userId: string,
    @Body() dto: CalculationParamsDto,
  ) {
    return this.settingsService.updateByUserId(userId, dto);
  }
}