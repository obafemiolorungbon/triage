import { Module } from '@nestjs/common';
import { EnvConfigModule } from '../config/config.module';
import { NotificationService } from './notification.service';

@Module({
  imports: [EnvConfigModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
