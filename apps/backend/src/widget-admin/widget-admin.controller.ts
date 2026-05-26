import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard } from '../guards/session.guard';
import { WidgetAdminService } from './widget-admin.service';

@Controller('widgets')
@UseGuards(SessionGuard)
@Roles('admin')
export class WidgetAdminController {
  constructor(private readonly widgets: WidgetAdminService) {}

  @Get()
  list() {
    return this.widgets.list();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.widgets.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.widgets.get(id);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() body: unknown) {
    return this.widgets.patch(id, body);
  }

  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.widgets.archive(id);
  }

  @Post(':id/rotate-secret')
  rotateSecret(@Param('id') id: string) {
    return this.widgets.rotateSecret(id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.widgets.duplicate(id);
  }
}
