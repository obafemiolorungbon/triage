import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard, type AuthedRequest } from '../guards/session.guard';
import { FeedbackService } from './feedback.service';

@Controller('tickets')
@UseGuards(SessionGuard)
export class TicketsController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  create(@Body() body: unknown) {
    return this.feedback.createTicket(body);
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

  @Patch(':id')
  @Roles('admin', 'agent')
  patch(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.feedback.updateStatus(id, body, req);
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
