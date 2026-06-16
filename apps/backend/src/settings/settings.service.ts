import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  escalationRuleSchema,
  workspaceConfigSchema,
} from '@triage/shared-types';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SLUG = 'default';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async getAll() {
    const [workspace, escalationRules] = await Promise.all([
      this.getWorkspace(),
      this.prisma.client.escalationRule.findMany({
        orderBy: [{ enabled: 'desc' }, { tier: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    return {
      workspace,
      escalationRules,
      integrations: {
        linear: {
          configured: Boolean(process.env.LINEAR_API_KEY && process.env.LINEAR_TEAM_ID),
        },
        jira: {
          configured: Boolean(
            process.env.JIRA_BASE_URL &&
              process.env.JIRA_EMAIL &&
              process.env.JIRA_API_TOKEN &&
              process.env.JIRA_PROJECT_KEY,
          ),
        },
      },
    };
  }

  async updateAll(body: unknown) {
    const data = body as {
      workspace?: unknown;
      escalationRules?: unknown[];
    };

    if (data.workspace) {
      const parsed = workspaceConfigSchema.safeParse(data.workspace);
      if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
      await this.prisma.client.workspace.upsert({
        where: { slug: DEFAULT_SLUG },
        update: parsed.data,
        create: { slug: DEFAULT_SLUG, ...parsed.data },
      });
    }

    if (Array.isArray(data.escalationRules)) {
      const parsed = data.escalationRules.map((rule) => {
        const result = escalationRuleSchema.safeParse(rule);
        if (!result.success) throw new BadRequestException(result.error.flatten());
        return result.data;
      });
      await this.prisma.client.$transaction([
        this.prisma.client.escalationRule.deleteMany({}),
        ...parsed.map((rule) =>
          this.prisma.client.escalationRule.create({
            data: rule as Prisma.EscalationRuleCreateInput,
          }),
        ),
      ]);
    }

    return this.getAll();
  }

  async getWorkspace() {
    return this.prisma.client.workspace.upsert({
      where: { slug: DEFAULT_SLUG },
      update: {},
      create: { slug: DEFAULT_SLUG },
    });
  }

  async getDefaultWidget() {
    const workspace = await this.getWorkspace();
    const widget = await this.prisma.client.widget.findFirst({
      where: { workspaceId: workspace.id, archivedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { theme: true },
    });
    if (widget) return widget;
    return this.prisma.client.widget.create({
      data: {
        workspaceId: workspace.id,
        name: 'Legacy',
        widgetKey: 'local-dev-widget',
        widgetSecret: 'legacy-secret',
        theme: { create: {} },
      },
      include: { theme: true },
    });
  }

  async getCompanyPromptContext() {
    const workspace = await this.getWorkspace();
    return [
      `Company: ${workspace.companyName}`,
      `Industry: ${workspace.industry}`,
      workspace.productDescription && `Product: ${workspace.productDescription}`,
      workspace.supportContext && `Support context: ${workspace.supportContext}`,
      workspace.escalationGuidance && `Escalation guidance: ${workspace.escalationGuidance}`,
      workspace.aiContextNotes && `AI notes: ${workspace.aiContextNotes}`,
    ]
      .filter(Boolean)
      .join('\n');
  }
}
