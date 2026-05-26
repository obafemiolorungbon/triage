import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsModule } from '../analytics/analytics.module';
import { EnvConfigModule } from '../config/config.module';
import { DigestModule } from '../digest/digest.module';
import { EventsModule } from '../events/events.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { SessionGuard } from '../guards/session.guard';
import { IntegrationsModule } from '../integrations/integrations.module';
import { KbModule } from '../kb/kb.module';
import { TenantsModule } from '../tenants/tenants.module';
import { NotificationModule } from '../notification/notification.module';
import { NotificationsInAppModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { SettingsModule } from '../settings/settings.module';
import { WidgetAdminModule } from '../widget-admin/widget-admin.module';
import { WidgetModule } from '../widget/widget.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    EnvConfigModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    PrismaModule,
    QueueModule,
    NotificationModule,
    EventsModule,
    FeedbackModule,
    AnalyticsModule,
    NotificationsInAppModule,
    SettingsModule,
    WidgetAdminModule,
    WidgetModule,
    KbModule,
    DigestModule,
    IntegrationsModule,
    TenantsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, { provide: APP_GUARD, useClass: SessionGuard }],
})
export class AppModule {}
