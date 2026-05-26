import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../decorators/public.decorator';
import { WidgetPublicGuard } from './widget-public.guard';
import { WidgetService } from './widget.service';

@Controller('widget')
export class WidgetController {
  constructor(private readonly widget: WidgetService) {}

  @Get('config/:widgetKey')
  @Public()
  @UseGuards(WidgetPublicGuard)
  config(@Param('widgetKey') widgetKey: string) {
    return this.widget.publicConfig(widgetKey);
  }

  @Post('feedback')
  @Public()
  @UseGuards(WidgetPublicGuard)
  submit(@Body() body: unknown, @Req() req: Request) {
    return this.widget.submit(body, req);
  }

  @Post('upload-url')
  @Public()
  @UseGuards(WidgetPublicGuard)
  uploadUrl(@Body() body: unknown) {
    return this.widget.createUploadUrl(body);
  }

  @Post('survey')
  @Public()
  @UseGuards(WidgetPublicGuard)
  survey(@Body() body: unknown) {
    return this.widget.submitSurvey(body);
  }
}
