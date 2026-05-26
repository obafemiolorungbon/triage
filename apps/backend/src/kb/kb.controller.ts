import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard } from '../guards/session.guard';
import { KbService } from './kb.service';

@Controller()
export class KbController {
  constructor(private readonly kb: KbService) {}

  @Get('kb/articles')
  @UseGuards(SessionGuard)
  @Roles('admin', 'agent')
  listArticles() {
    return this.kb.listArticles();
  }

  @Post('kb/articles')
  @UseGuards(SessionGuard)
  @Roles('admin')
  createArticle(@Body() body: unknown) {
    return this.kb.createArticle(body);
  }

  @Post('kb/imports/preview')
  @UseGuards(SessionGuard)
  @Roles('admin')
  previewImport(@Body() body: unknown) {
    return this.kb.previewImport(body);
  }

  @Post('kb/imports')
  @UseGuards(SessionGuard)
  @Roles('admin')
  importArticles(@Body() body: unknown) {
    return this.kb.importArticles(body);
  }

  @Get('kb/articles/:id')
  @UseGuards(SessionGuard)
  @Roles('admin', 'agent')
  getArticle(@Param('id') id: string) {
    return this.kb.getArticle(id);
  }

  @Patch('kb/articles/:id')
  @UseGuards(SessionGuard)
  @Roles('admin')
  updateArticle(@Param('id') id: string, @Body() body: unknown) {
    return this.kb.updateArticle(id, body);
  }

  @Delete('kb/articles/:id')
  @UseGuards(SessionGuard)
  @Roles('admin')
  deleteArticle(@Param('id') id: string) {
    return this.kb.deleteArticle(id);
  }

  @Post('widget/kb/search')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  search(@Body() body: unknown) {
    return this.kb.publicSearch(body);
  }

  @Post('widget/kb/answer')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  answer(@Body() body: unknown) {
    return this.kb.publicAnswer(body);
  }

  @Post('widget/kb/events')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  event(@Body() body: unknown) {
    return this.kb.recordEvent(body);
  }
}
