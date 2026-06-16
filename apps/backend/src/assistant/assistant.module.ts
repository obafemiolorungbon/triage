import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { SettingsModule } from '../settings/settings.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantToolRegistry } from './assistant-tool-registry';
import { AssistantToolsService } from './assistant-tools.service';
import { LocalAssistantOrchestrator } from './local-assistant.orchestrator';

@Module({
  imports: [AiModule, RetrievalModule, SettingsModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    AssistantToolRegistry,
    AssistantToolsService,
    LocalAssistantOrchestrator,
  ],
})
export class AssistantModule {}
