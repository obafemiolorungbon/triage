import { Module } from '@nestjs/common';
import { EnvConfigModule } from '../config/config.module';
import { AiService } from './ai.service';

@Module({
  imports: [EnvConfigModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
