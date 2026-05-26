import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../decorators/public.decorator';
import { WidgetService } from './widget.service';

@Controller('widget')
export class WidgetController {
  constructor(private readonly widget: WidgetService) {}

  @Get('config/:widgetKey')
  @Public()
  config(@Param('widgetKey') widgetKey: string) {
    return this.widget.publicConfig(widgetKey);
  }

  @Post('feedback')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  submit(@Body() body: unknown) {
    return this.widget.submit(body);
  }

  @Post('upload-url')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  uploadUrl(@Body() body: unknown) {
    return this.widget.createUploadUrl(body);
  }

  @Post('survey')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  survey(@Body() body: unknown) {
    return this.widget.submitSurvey(body);
  }
}
