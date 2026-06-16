import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { assistantQueryBodySchema } from '@triage/shared-types';
import { randomUUID } from 'node:crypto';
import type { Env } from '../config/env.schema';
import { SettingsService } from '../settings/settings.service';
import { LocalAssistantOrchestrator } from './local-assistant.orchestrator';

@Injectable()
export class AssistantService {
  constructor(
    private readonly orchestrator: LocalAssistantOrchestrator,
    private readonly settings: SettingsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async query(
    body: unknown,
    actor: { userId?: string; role: 'admin' | 'agent' },
  ) {
    const parsed = assistantQueryBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const workspace = await this.settings.getWorkspace();
    const maxDurationMs = this.config.get('ASSISTANT_TIMEOUT_MS', {
      infer: true,
    });
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), maxDurationMs);
    timeout.unref?.();

    try {
      return await this.orchestrator.run({
        message: parsed.data.message,
        history: parsed.data.history ?? [],
        context: {
          runId: randomUUID(),
          workspaceId: workspace.id,
          userId: actor.userId,
          role: actor.role,
          startedAt: Date.now(),
          abortSignal: abortController.signal,
        },
        budget: {
          maxSteps: 4,
          maxToolCalls: Math.min(parsed.data.maxToolCalls, 6),
          maxDurationMs,
          maxEvidenceCharacters: 24_000,
          maxSources: 16,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
