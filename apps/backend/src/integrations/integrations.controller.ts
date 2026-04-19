import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard } from '../guards/session.guard';

@Controller('integrations')
@UseGuards(SessionGuard)
@Roles('admin')
export class IntegrationsController {
  /** Stub: register Jira outbound webhook target (Phase 3). */
  @Post('jira/configure')
  jiraConfigure(@Body() body: { baseUrl: string; projectKey: string }) {
    return { ok: true, received: body };
  }
}
