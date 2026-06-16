import { NestFactory } from '@nestjs/core';
import type {
  EscalationTier,
  FeedbackSentiment,
  FeedbackSeverity,
  FeedbackStatus,
  Prisma,
  WidgetSubmissionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackIndexService } from '../retrieval/feedback-index.service';
import { HybridRetrievalService } from '../retrieval/hybrid-retrieval.service';
import { RetrievalModule } from '../retrieval/retrieval.module';

const SAMPLE_PREFIX = 'TR-RAG-';
const SAMPLE_BATCH = 'agentic-rag-sample-v1';
const DEFAULT_COUNT = 150;
const INDEX_CONCURRENCY = 4;

type IssueDefinition = {
  category: string;
  submissionType: WidgetSubmissionType;
  severity: FeedbackSeverity;
  sentiment: FeedbackSentiment;
  knowledgeGap?: boolean;
  productArea: string;
  messages: string[];
  summaries: string[];
};

const ISSUES: IssueDefinition[] = [
  {
    category: 'billing',
    submissionType: 'bug',
    severity: 'high',
    sentiment: 'negative',
    productArea: 'invoicing',
    messages: [
      'Our invoice total is higher than the usage shown in the dashboard.',
      'We were charged twice for the same monthly subscription.',
      'The annual plan discount disappeared from the renewal invoice.',
      'A cancelled seat is still appearing on the current bill.',
      'Usage credits were not applied before the card was charged.',
      'The tax amount changed after the invoice had already been finalized.',
    ],
    summaries: [
      'Customer reports an invoice total that does not match recorded usage.',
      'Customer reports a duplicate subscription charge.',
      'Renewal invoice is missing the expected annual discount.',
      'Removed seats continue to appear as billable items.',
      'Available usage credits were not deducted from the charge.',
      'Finalized invoice shows an unexpected tax adjustment.',
    ],
  },
  {
    category: 'transactions',
    submissionType: 'bug',
    severity: 'critical',
    sentiment: 'negative',
    productArea: 'payments',
    messages: [
      'The transfer says completed, but the recipient still has not received the money.',
      'A card payment failed while the customer was charged anyway.',
      'The same payout was sent twice after we retried a timed-out request.',
      'A refund is marked successful, but it has not reached the customer account.',
      'Bank transfers remain pending for several hours with no explanation.',
      'The transaction history shows the wrong currency conversion amount.',
    ],
    summaries: [
      'Completed transfer has not reached the intended recipient.',
      'Failed card payment still produced a customer charge.',
      'Retrying a timed-out payout created a duplicate transfer.',
      'Successful refund has not arrived in the customer account.',
      'Bank transfer remains pending beyond the expected processing time.',
      'Transaction history displays an incorrect converted amount.',
    ],
  },
  {
    category: 'authentication',
    submissionType: 'bug',
    severity: 'high',
    sentiment: 'negative',
    productArea: 'account_access',
    messages: [
      'I changed phones and now every two-factor authentication code is rejected.',
      'The password reset email arrives after the link has already expired.',
      'Single sign-on keeps redirecting our team back to the login page.',
      'An invited teammate sees an unauthorized message after accepting the invitation.',
      'The session ends every few minutes even while I am actively using the app.',
      'Backup recovery codes are being reported as already used.',
    ],
    summaries: [
      'Two-factor codes fail after the customer changes devices.',
      'Password reset links expire before customers can use them.',
      'Single sign-on enters a repeated login redirect.',
      'Accepted workspace invitation results in an unauthorized response.',
      'Active customer sessions expire unexpectedly.',
      'Unused account recovery codes are rejected.',
    ],
  },
  {
    category: 'checkout',
    submissionType: 'bug',
    severity: 'high',
    sentiment: 'negative',
    productArea: 'checkout',
    messages: [
      'Checkout freezes after I enter a valid promotion code.',
      'The upgrade button spins forever after card verification.',
      'Mobile Safari closes the checkout modal before payment completes.',
      'The selected plan changes when I return from the payment provider.',
      'Checkout displays a generic error only for enterprise accounts.',
      'The billing address form rejects valid postal codes.',
    ],
    summaries: [
      'Checkout freezes after a valid promotion code is entered.',
      'Plan upgrade stalls after card verification.',
      'Mobile Safari closes checkout before payment completion.',
      'Checkout returns from payment with the wrong plan selected.',
      'Enterprise accounts receive an unexplained checkout failure.',
      'Valid billing postal codes are rejected during checkout.',
    ],
  },
  {
    category: 'integrations',
    submissionType: 'bug',
    severity: 'medium',
    sentiment: 'negative',
    productArea: 'integrations',
    messages: [
      'Slack notifications stopped arriving after we reconnected the workspace.',
      'The Salesforce sync creates duplicate contacts every night.',
      'Our webhook receives events out of order during traffic spikes.',
      'The Jira integration maps every issue to the wrong project.',
      'Zapier reports success, but the customer record is never updated.',
      'The API token works for reads but receives forbidden errors on writes.',
    ],
    summaries: [
      'Slack notifications stopped after workspace reconnection.',
      'Salesforce synchronization creates duplicate contacts.',
      'Webhook events arrive out of order under higher load.',
      'Jira integration selects an incorrect project.',
      'Successful Zapier runs do not update customer records.',
      'API token unexpectedly lacks write permissions.',
    ],
  },
  {
    category: 'reporting',
    submissionType: 'bug',
    severity: 'medium',
    sentiment: 'negative',
    productArea: 'analytics',
    messages: [
      'The revenue report excludes refunds from the final total.',
      'CSV exports use a different timezone from the dashboard.',
      'The weekly active users chart drops accounts with multiple workspaces.',
      'Filtering by enterprise plan returns starter accounts too.',
      'Scheduled reports arrive with an empty attachment.',
      'The dashboard count changes after refreshing without any new data.',
    ],
    summaries: [
      'Revenue report does not account for refunds.',
      'CSV export and dashboard use inconsistent timezones.',
      'Active-user chart omits multi-workspace accounts.',
      'Enterprise filter includes accounts from other plans.',
      'Scheduled report emails contain empty attachments.',
      'Dashboard totals change unexpectedly after refresh.',
    ],
  },
  {
    category: 'notifications',
    submissionType: 'question',
    severity: 'low',
    sentiment: 'neutral',
    knowledgeGap: true,
    productArea: 'notifications',
    messages: [
      'How can I mute invoice emails for test workspaces only?',
      'There is no explanation for which events trigger the urgent alert.',
      'Can each team member choose a different notification schedule?',
      'We need to know why digest emails sometimes skip resolved tickets.',
      'Where can I see a history of notifications sent to customers?',
      'Can webhook failure alerts be routed to a separate Slack channel?',
    ],
    summaries: [
      'Customer asks how to mute invoice emails for test workspaces.',
      'Documentation does not define urgent-alert triggers.',
      'Customer wants per-user notification schedules.',
      'Customer asks why digest emails omit some resolved tickets.',
      'Customer cannot find a history of sent notifications.',
      'Customer wants webhook alerts routed to another Slack channel.',
    ],
  },
  {
    category: 'performance',
    submissionType: 'bug',
    severity: 'high',
    sentiment: 'negative',
    productArea: 'platform',
    messages: [
      'The customer list takes more than twenty seconds to open.',
      'Typing in the global search box becomes delayed after a few queries.',
      'Large invoice pages time out before the line items appear.',
      'The dashboard becomes unresponsive when the date range covers a year.',
      'Bulk importing accounts leaves the browser frozen.',
      'API response time doubles during the first hour of each month.',
    ],
    summaries: [
      'Customer list has a severe loading delay.',
      'Global search input becomes increasingly delayed.',
      'Invoices with many line items time out.',
      'Year-long dashboard ranges make the interface unresponsive.',
      'Bulk account imports freeze the browser.',
      'API latency increases at the start of each month.',
    ],
  },
  {
    category: 'documentation',
    submissionType: 'question',
    severity: 'low',
    sentiment: 'neutral',
    knowledgeGap: true,
    productArea: 'developer_experience',
    messages: [
      'The webhook guide does not say how long failed deliveries are retried.',
      'The API docs show a field that is missing from the actual response.',
      'There is no migration guide for moving from API version one to version two.',
      'The example for prorated billing uses an invalid date format.',
      'The role permissions page does not explain custom roles.',
      'I cannot find documentation for idempotency keys on refunds.',
    ],
    summaries: [
      'Webhook documentation omits the retry duration.',
      'Documented API response differs from the real response.',
      'API version migration guidance is missing.',
      'Prorated billing example contains an invalid date.',
      'Role documentation does not cover custom permissions.',
      'Refund idempotency-key documentation is missing.',
    ],
  },
  {
    category: 'feature_request',
    submissionType: 'idea',
    severity: 'low',
    sentiment: 'positive',
    productArea: 'productivity',
    messages: [
      'Please let teams save and share filtered dashboard views.',
      'It would help to schedule invoice previews before billing runs.',
      'We want an approval step before large refunds are processed.',
      'Please add keyboard shortcuts for moving between feedback tickets.',
      'A dark theme for exported customer portals would be useful.',
      'Let us compare two billing periods side by side.',
    ],
    summaries: [
      'Customer requests shared saved dashboard views.',
      'Customer requests scheduled invoice previews.',
      'Customer requests approval controls for large refunds.',
      'Customer requests keyboard navigation for feedback.',
      'Customer requests a dark theme for exported portals.',
      'Customer requests side-by-side billing-period comparison.',
    ],
  },
];

const CATEGORY_WEIGHTS = [
  ['billing', 28],
  ['transactions', 24],
  ['authentication', 20],
  ['checkout', 17],
  ['integrations', 15],
  ['reporting', 13],
  ['notifications', 11],
  ['performance', 9],
  ['documentation', 7],
  ['feature_request', 6],
] as const;

const FIRST_NAMES = [
  'Amina',
  'Noah',
  'Maya',
  'Ethan',
  'Zara',
  'Lucas',
  'Ivy',
  'Owen',
  'Nadia',
  'Mateo',
  'Leah',
  'Arjun',
  'Sofia',
  'Daniel',
  'Chloe',
  'Samira',
  'Jonah',
  'Priya',
  'Caleb',
  'Fatima',
];

const LAST_NAMES = [
  'Adeyemi',
  'Brooks',
  'Chen',
  'Diaz',
  'Evans',
  'Fischer',
  'Gupta',
  'Hassan',
  'Ito',
  'Johnson',
  'Khan',
  'Lopez',
  'Mensah',
  'Novak',
  'Okafor',
  'Patel',
  'Quinn',
  'Rossi',
  'Silva',
  'Turner',
];

const COMPANIES = [
  'Northstar Labs',
  'Juniper Commerce',
  'Atlas Freight',
  'Beacon Health',
  'Copper Finance',
  'Delta Learning',
  'Evergreen Retail',
  'Fieldstone Media',
  'Granite Works',
  'Harbor Systems',
  'Indigo Travel',
  'Keystone Foods',
  'Lumen Energy',
  'Meridian Legal',
  'Nimbus Studio',
];

const PLANS = ['starter', 'growth', 'enterprise'] as const;
const BROWSERS = [
  'Chrome 137',
  'Safari 18',
  'Firefox 139',
  'Edge 137',
  'Mobile Safari 18',
] as const;
const ENVIRONMENTS = ['production', 'sandbox'] as const;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(RetrievalModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const prisma = app.get(PrismaService).client;
    const indexer = app.get(FeedbackIndexService);

    if (options.cleanup) {
      const deleted = await cleanup(prisma);
      console.log(JSON.stringify({ batch: SAMPLE_BATCH, deleted }, null, 2));
      return;
    }

    const workspace = await prisma.workspace.upsert({
      where: { slug: 'default' },
      update: {},
      create: { slug: 'default' },
    });
    if (options.verify) {
      await verify(prisma, app.get(HybridRetrievalService), workspace.id);
      return;
    }
    const widget = await prisma.widget.findFirst({
      where: { workspaceId: workspace.id, archivedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!widget) {
      throw new Error(
        'No active widget exists in the default workspace. Run pnpm db:seed first.',
      );
    }

    const removedBeforeSeed = await cleanup(prisma);
    const generated = generateFeedback(options.count, widget.id);
    await prisma.feedback.createMany({
      data: generated.map((item) => item.feedback),
    });

    const created = await prisma.feedback.findMany({
      where: { shortId: { startsWith: SAMPLE_PREFIX } },
      select: {
        id: true,
        shortId: true,
        category: true,
        status: true,
        createdAt: true,
      },
      orderBy: { shortId: 'asc' },
    });
    const generatedByShortId = new Map(
      generated.map((item) => [item.feedback.shortId, item]),
    );
    await prisma.feedbackTriageRun.createMany({
      data: created.map((item) => {
        const generatedItem = generatedByShortId.get(item.shortId);
        if (!generatedItem) {
          throw new Error(`Missing generated data for ${item.shortId}`);
        }
        return {
          feedbackId: item.id,
          ...generatedItem.triageRun,
        };
      }),
    });

    const indexResults = options.skipIndex
      ? []
      : await mapConcurrent(created, INDEX_CONCURRENCY, async (item) => {
          try {
            return await indexer.indexFeedback(item.id);
          } catch (error) {
            return {
              feedbackId: item.id,
              embedded: false,
              reusedEmbedding: false,
              error: error instanceof Error ? error.message : 'Indexing failed',
            };
          }
        });
    const summary = summarize(created);
    console.log(
      JSON.stringify(
        {
          batch: SAMPLE_BATCH,
          removedBeforeSeed,
          created: created.length,
          indexed: indexResults.length,
          embedded: indexResults.filter((item) => item.embedded).length,
          lexicalOnly: indexResults.filter(
            (item) => !item.embedded && !('error' in item),
          ).length,
          indexFailures: indexResults.filter((item) => 'error' in item).length,
          cleanupCommand: 'pnpm cleanup:rag-feedback',
          ...summary,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

function generateFeedback(count: number, widgetId: string) {
  const random = mulberry32(20260615);
  const categories = weightedCategories(count);
  shuffle(categories, random);
  const now = new Date();

  return categories.map((category, index) => {
    const issue = ISSUES.find((item) => item.category === category);
    if (!issue) throw new Error(`Unknown sample category: ${category}`);
    const variant = index % issue.messages.length;
    const firstName = pick(FIRST_NAMES, random);
    const lastName = pick(LAST_NAMES, random);
    const company = pick(COMPANIES, random);
    const plan = pick(PLANS, random);
    const browser = pick(BROWSERS, random);
    const environment = pick(ENVIRONMENTS, random);
    const affectedUsers = 1 + Math.floor(random() * 75);
    const createdAt = sampleCreatedAt(index, now, random);
    const status = sampleStatus(index, issue, random);
    const severity = varySeverity(issue.severity, index, random);
    const escalationTier = escalationFor(severity, affectedUsers, status);
    const sentiment = varySentiment(issue.sentiment, index);
    const shortId = `${SAMPLE_PREFIX}${String(index + 1).padStart(4, '0')}`;
    const suffix = customerContext(
      company,
      plan,
      browser,
      environment,
      affectedUsers,
      index,
    );
    const rawText = `${issue.messages[variant]} ${suffix}`;
    const cleanedText = `${issue.summaries[variant]} Account context: ${plan} plan, ${environment}, ${affectedUsers} affected user${affectedUsers === 1 ? '' : 's'}.`;
    const triagedAt =
      status === 'new'
        ? null
        : new Date(
            Math.min(
              now.getTime(),
              createdAt.getTime() + (15 + Math.floor(random() * 240)) * 60_000,
            ),
          );
    const resolvedAt =
      status === 'resolved' || status === 'rejected'
        ? new Date(
            Math.min(
              now.getTime(),
              createdAt.getTime() +
                (4 + Math.floor(random() * 96)) * 60 * 60_000,
            ),
          )
        : null;
    const escalationReason =
      escalationTier === 'none'
        ? null
        : `${affectedUsers} customer user${affectedUsers === 1 ? '' : 's'} affected on the ${plan} plan in ${environment}.`;

    const feedback: Prisma.FeedbackCreateManyInput = {
      shortId,
      widgetId,
      submitterEmail: `${firstName}.${lastName}.${index + 1}@example.test`
        .toLowerCase()
        .replaceAll(' ', ''),
      rawText,
      cleanedText,
      submissionType: issue.submissionType,
      category: issue.category,
      severity,
      escalationTier,
      escalationReason,
      sentiment,
      status,
      isNoise: status === 'rejected',
      knowledgeGap: issue.knowledgeGap ?? false,
      userContext: {
        name: `${firstName} ${lastName}`,
        company,
        accountId: `acct_rag_${String(index + 1).padStart(4, '0')}`,
      },
      metadata: {
        ragSampleBatch: SAMPLE_BATCH,
        plan,
        environment,
        browser,
        affectedUsers,
        productArea: issue.productArea,
        region: pick(['us-east', 'us-west', 'eu-west', 'ap-south'], random),
        appVersion: `2026.${1 + (index % 6)}.${index % 12}`,
      },
      consent: {
        granted: true,
        text: 'Synthetic RAG evaluation fixture.',
      },
      sourceUrl: `https://app.example.test/${issue.productArea}`,
      sourceTitle: `${company} ${issue.productArea.replaceAll('_', ' ')}`,
      createdAt,
      triagedAt,
      resolvedAt,
    };

    return {
      feedback,
      triageRun: {
        model: 'synthetic/rag-fixture-v1',
        cleanedText,
        category: issue.category,
        sentiment,
        knowledgeGap: issue.knowledgeGap ?? false,
        suggestedTags: [issue.productArea, plan, environment, severity],
        escalationTier,
        escalationReason,
        issueTitle: issue.summaries[variant],
        issueBody: rawText,
        industryContext: 'Synthetic B2B SaaS feedback for RAG evaluation.',
        createdAt: triagedAt ?? createdAt,
      } satisfies Omit<Prisma.FeedbackTriageRunCreateManyInput, 'feedbackId'>,
    };
  });
}

async function cleanup(prisma: PrismaService['client']) {
  const result = await prisma.feedback.deleteMany({
    where: { shortId: { startsWith: SAMPLE_PREFIX } },
  });
  return result.count;
}

async function verify(
  prisma: PrismaService['client'],
  retrieval: HybridRetrievalService,
  workspaceId: string,
) {
  const feedback = await prisma.feedback.count({
    where: { shortId: { startsWith: SAMPLE_PREFIX } },
  });
  const triageRuns = await prisma.feedbackTriageRun.count({
    where: { feedback: { shortId: { startsWith: SAMPLE_PREFIX } } },
  });
  const [indexStats] = await prisma.$queryRawUnsafe<
    Array<{ indexed: number; embedded: number }>
  >(
    `
    SELECT
      count(*)::int AS indexed,
      count(d.embedding)::int AS embedded
    FROM "feedback_search_document" d
    JOIN feedback f ON f.id = d."feedbackId"
    WHERE f."shortId" LIKE $1
    `,
    `${SAMPLE_PREFIX}%`,
  );
  const semanticExamples = await retrieval.searchFeedback({
    workspaceId,
    query: 'money moved but the recipient never received it',
    filters: { resolution: 'open' },
    limit: 5,
  });
  const exactExamples = await retrieval.searchFeedback({
    workspaceId,
    query: 'duplicate subscription charge',
    filters: { resolution: 'open' },
    limit: 5,
  });
  console.log(
    JSON.stringify(
      {
        batch: SAMPLE_BATCH,
        feedback,
        triageRuns,
        indexed: indexStats?.indexed ?? 0,
        embedded: indexStats?.embedded ?? 0,
        semanticQuery: semanticExamples.map((item) => ({
          shortId: item.shortId,
          category: item.category,
          status: item.status,
          text: item.cleanedText,
          fusedScore: item.fusedScore,
        })),
        exactQuery: exactExamples.map((item) => ({
          shortId: item.shortId,
          category: item.category,
          status: item.status,
          text: item.cleanedText,
          fusedScore: item.fusedScore,
        })),
      },
      null,
      2,
    ),
  );
}

function weightedCategories(count: number) {
  const base = CATEGORY_WEIGHTS.flatMap(([category, weight]) =>
    Array.from({ length: weight }, () => category),
  );
  return Array.from({ length: count }, (_, index) => base[index % base.length]);
}

function sampleCreatedAt(index: number, now: Date, random: () => number) {
  const ageHours =
    index < 24
      ? random() * Math.min(12, Math.max(1, now.getUTCHours()))
      : index < 75
        ? 24 + random() * 29 * 24
        : 30 * 24 + random() * 90 * 24;
  return new Date(now.getTime() - ageHours * 60 * 60_000);
}

function sampleStatus(
  index: number,
  issue: IssueDefinition,
  random: () => number,
): FeedbackStatus {
  if (index % 31 === 0) return 'rejected';
  const value = random();
  if (issue.submissionType === 'idea' && value < 0.45) return 'claimed';
  if (value < 0.18) return 'new';
  if (value < 0.42) return 'triaged';
  if (value < 0.58) return 'claimed';
  if (value < 0.75) return 'in_progress';
  return 'resolved';
}

function varySeverity(
  base: FeedbackSeverity,
  index: number,
  random: () => number,
): FeedbackSeverity {
  if (index % 19 === 0) return 'critical';
  if (random() > 0.2) return base;
  const levels: FeedbackSeverity[] = ['low', 'medium', 'high', 'critical'];
  const position = levels.indexOf(base);
  return levels[Math.max(0, Math.min(levels.length - 1, position - 1))];
}

function varySentiment(
  base: FeedbackSentiment,
  index: number,
): FeedbackSentiment {
  if (index % 17 === 0 && base === 'negative') return 'neutral';
  return base;
}

function escalationFor(
  severity: FeedbackSeverity,
  affectedUsers: number,
  status: FeedbackStatus,
): EscalationTier {
  if (status === 'rejected' || status === 'resolved') return 'none';
  if (severity === 'critical' && affectedUsers >= 20) return 'critical';
  if (severity === 'critical' || affectedUsers >= 50) return 'expedite';
  if (severity === 'high' || affectedUsers >= 20) return 'watch';
  return 'none';
}

function customerContext(
  company: string,
  plan: string,
  browser: string,
  environment: string,
  affectedUsers: number,
  index: number,
) {
  const contexts = [
    `This affects ${affectedUsers} users at ${company} on our ${plan} plan in ${environment}.`,
    `${company} reproduced it in ${browser}; ${affectedUsers} teammates are blocked.`,
    `We first noticed this in ${environment} on ${browser}, and it affects ${affectedUsers} users.`,
    `Account ${company} is on ${plan}; the problem is repeatable for ${affectedUsers} people.`,
  ];
  return contexts[index % contexts.length];
}

function summarize(
  rows: Array<{
    category: string | null;
    status: FeedbackStatus;
    createdAt: Date;
  }>,
) {
  const categories = countBy(rows, (item) => item.category ?? 'unclassified');
  const statuses = countBy(rows, (item) => item.status);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60_000;
  return {
    categories,
    statuses,
    createdWithinSevenDays: rows.filter(
      (item) => item.createdAt.getTime() >= sevenDaysAgo,
    ).length,
  };
}

function countBy<T>(items: T[], keyOf: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyOf(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  run: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await run(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function parseArgs(args: string[]) {
  const cleanup = args.includes('--cleanup');
  const verify = args.includes('--verify');
  const skipIndex = args.includes('--skip-index');
  const countArg = args.find((arg) => arg.startsWith('--count='));
  const count = countArg
    ? Number.parseInt(countArg.slice('--count='.length), 10)
    : DEFAULT_COUNT;
  if (!Number.isInteger(count) || count < 1 || count > 2_000) {
    throw new Error('--count must be an integer between 1 and 2000.');
  }
  return { cleanup, verify, skipIndex, count };
}

function pick<T>(items: readonly T[], random: () => number) {
  return items[Math.floor(random() * items.length)];
}

function shuffle<T>(items: T[], random: () => number) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
