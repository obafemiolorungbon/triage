import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard } from '../guards/session.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(SessionGuard)
@Roles('admin', 'agent')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary() {
    return this.analytics.summary();
  }
}
