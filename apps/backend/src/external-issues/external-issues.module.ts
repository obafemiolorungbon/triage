import { Module } from '@nestjs/common';
import { EnvConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExternalIssuesService } from './external-issues.service';

@Module({
  imports: [EnvConfigModule, PrismaModule],
  providers: [ExternalIssuesService],
  exports: [ExternalIssuesService],
})
export class ExternalIssuesModule {}
