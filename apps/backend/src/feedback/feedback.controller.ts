import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard, type AuthedRequest } from '../guards/session.guard';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(SessionGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  create(@Body() body: unknown) {
    return this.feedback.createPublic(body);
  }

  @Get()
  @Roles('admin', 'agent')
  list(@Query() query: Record<string, string | string[] | undefined>, @Req() req: AuthedRequest) {
    return this.feedback.list(query, req.session!.user.id);
  }

  @Get(':id/similar')
  @Roles('admin', 'agent')
  similar(@Param('id') id: string) {
    return this.feedback.similar(id);
  }

  @Get(':id')
  @Roles('admin', 'agent')
  getOne(@Param('id') id: string) {
    return this.feedback.getById(id);
  }

  @Post(':id/claim')
  @Roles('admin', 'agent')
  claim(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.feedback.claim(id, req);
  }

  @Post(':id/resolve')
  @Roles('admin', 'agent')
  resolve(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.feedback.resolve(id, req);
  }

  @Post(':id/comments')
  @Roles('admin', 'agent')
  comment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ) {
    return this.feedback.addComment(id, body, req);
  }
}
