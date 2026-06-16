import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard, type AuthedRequest } from '../guards/session.guard';
import { AssistantService } from './assistant.service';

@Controller('assistant')
@UseGuards(SessionGuard)
@Roles('admin', 'agent')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('query')
  query(@Body() body: unknown, @Req() req: AuthedRequest) {
    const user = req.session?.user as
      | { id?: string; role?: 'admin' | 'agent' }
      | undefined;
    return this.assistant.query(body, {
      userId: user?.id,
      role: user?.role === 'admin' ? 'admin' : 'agent',
    });
  }
}
