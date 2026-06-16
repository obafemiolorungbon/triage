import { Inject, Injectable } from '@nestjs/common';
import type { EscalationTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TIER_WEIGHT: Record<EscalationTier, number> = {
  none: 0,
  watch: 1,
  expedite: 2,
  critical: 3,
};

@Injectable()
export class EscalationService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async evaluate(input: {
    metadata?: Record<string, unknown> | null;
    userContext?: Record<string, unknown> | null;
  }): Promise<{ escalationTier: EscalationTier; escalationReason: string | null }> {
    const rules = await this.prisma.client.escalationRule.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
    });

    let best: { escalationTier: EscalationTier; escalationReason: string | null } = {
      escalationTier: 'none',
      escalationReason: null,
    };
    const context = {
      ...(input.userContext ?? {}),
      ...(input.metadata ?? {}),
    };
    const severity = String(context.severity ?? '').toLowerCase();
    if (severity === 'critical') {
      best = {
        escalationTier: 'critical',
        escalationReason: 'Submitter marked severity as critical.',
      };
    } else if (severity === 'high') {
      best = {
        escalationTier: 'expedite',
        escalationReason: 'Submitter marked severity as high.',
      };
    }

    for (const rule of rules) {
      if (!this.matches(context, rule.field, rule.operator, rule.value)) continue;
      const tier = rule.tier as EscalationTier;
      if (TIER_WEIGHT[tier] > TIER_WEIGHT[best.escalationTier]) {
        best = { escalationTier: tier, escalationReason: rule.reason };
      }
    }

    return best;
  }

  private matches(
    context: Record<string, unknown>,
    field: string,
    operator: string,
    expected: string | null,
  ) {
    const actual = this.readPath(context, field);
    if (operator === 'exists') return actual !== undefined && actual !== null && actual !== '';
    if (actual === undefined || actual === null) return false;

    const actualText = String(actual).trim().toLowerCase();
    const expectedText = String(expected ?? '').trim().toLowerCase();

    if (operator === 'equals') return actualText === expectedText;
    if (operator === 'contains') return actualText.includes(expectedText);
    if (operator === 'numeric_gte') {
      const left = Number(actual);
      const right = Number(expected);
      return Number.isFinite(left) && Number.isFinite(right) && left >= right;
    }
    return false;
  }

  private readPath(context: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, part) => {
      if (!acc || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[part];
    }, context);
  }
}
