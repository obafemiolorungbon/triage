import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { WidgetAdminController } from './widget-admin.controller';
import { WidgetAdminService } from './widget-admin.service';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [WidgetAdminController],
  providers: [WidgetAdminService],
})
export class WidgetAdminModule {}
