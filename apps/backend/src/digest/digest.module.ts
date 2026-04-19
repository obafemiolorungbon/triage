import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { DigestService } from './digest.service';

@Module({
  imports: [NotificationModule],
  providers: [DigestService],
})
export class DigestModule {}
