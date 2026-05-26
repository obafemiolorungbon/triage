import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard } from '../guards/session.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(SessionGuard)
@Roles('admin')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getAll() {
    return this.settings.getAll();
  }

  @Patch()
  updateAll(@Body() body: unknown) {
    return this.settings.updateAll(body);
  }
}
