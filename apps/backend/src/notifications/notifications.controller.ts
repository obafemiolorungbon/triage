import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard, type AuthedRequest } from '../guards/session.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(SessionGuard)
@Roles('admin', 'agent')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.notifications.listForUser(req.session!.user.id);
  }

  @Patch('read')
  markRead(
    @Req() req: AuthedRequest,
    @Body() body: { ids: string[] },
  ) {
    return this.notifications.markRead(req.session!.user.id, body.ids ?? []);
  }
}
