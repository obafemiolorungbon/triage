import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      slug: 'default',
      companyName: 'Acme Cloud',
      productDescription:
        'A B2B platform for usage-based billing, customer portals, and account operations.',
      industry: 'B2B SaaS',
      supportContext:
        'Support prioritizes checkout, billing, onboarding, and account access issues.',
      escalationGuidance:
        'Critical when billing or checkout blocks paid customers. Expedite production regressions and enterprise account issues.',
      aiContextNotes:
        'Attach source URL, account plan, browser, and affected user count whenever available.',
    },
  });

  const widget = await prisma.widget.upsert({
    where: { widgetKey: 'local-dev-widget' },
    update: {
      workspaceId: workspace.id,
      archivedAt: null,
      devMode: true,
    },
    create: {
      workspaceId: workspace.id,
      name: 'Demo website widget',
      widgetKey: 'local-dev-widget',
      widgetSecret: 'local-dev-widget-secret',
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
      ],
      devMode: true,
      brandColor: '#b8d66b',
      accentColor: '#11100e',
      position: 'bottom-right',
      title: 'Send product feedback',
      description:
        'Report a bug, ask a question, or share what would make Acme Cloud better.',
      successMessage: 'Thanks. Your feedback is now in the triage queue.',
      requireConsent: true,
      privacyPolicyUrl: 'https://example.com/privacy',
      consentText: 'I agree to be contacted about this feedback.',
      surveyMode: 'csat',
      pageRules: {
        include: [{ kind: 'urlPath', op: 'startsWith', value: '/' }],
        exclude: [],
      },
      triggerConfig: { mode: 'manual' },
    },
  });

  await prisma.widgetTheme.upsert({
    where: { widgetId: widget.id },
    update: {},
    create: {
      widgetId: widget.id,
      surfaceColor: '#11100e',
      textColor: '#f5efe5',
      launcherIcon: 'message-circle',
      launcherLabel: 'Feedback',
      borderRadius: '18px',
      shadow: 'strong',
    },
  });

  const fields = [
    {
      key: 'title',
      label: 'Summary',
      kind: 'text' as const,
      target: 'title' as const,
      required: true,
      placeholder: 'Checkout fails after discount code',
      order: 0,
    },
    {
      key: 'message',
      label: 'What happened?',
      kind: 'textarea' as const,
      target: 'message' as const,
      required: true,
      placeholder: 'Tell us what you expected and what actually happened.',
      order: 1,
    },
    {
      key: 'account_plan',
      label: 'Plan',
      kind: 'select' as const,
      target: 'metadata' as const,
      required: false,
      options: ['free', 'starter', 'growth', 'enterprise'],
      order: 2,
    },
    {
      key: 'screenshot',
      label: 'Screenshot',
      kind: 'file' as const,
      target: 'metadata' as const,
      required: false,
      helpText: 'Attach an image if it makes the issue easier to understand.',
      order: 3,
    },
  ];

  for (const field of fields) {
    await prisma.widgetField.upsert({
      where: { widgetId_key: { widgetId: widget.id, key: field.key } },
      update: field,
      create: { ...field, widgetId: widget.id },
    });
  }

  const article = await prisma.kbArticle.upsert({
    where: {
      workspaceId_slug: {
        workspaceId: workspace.id,
        slug: 'discount-code-troubleshooting',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      slug: 'discount-code-troubleshooting',
      title: 'Troubleshooting discount code checkout issues',
      published: true,
      body: [
        '## Check code validity',
        'Confirm the discount code is active, within its usage window, and valid for the selected plan.',
        '',
        '## Review account eligibility',
        'Enterprise-only promotions will not apply to self-serve plans unless the account has been granted an exception.',
        '',
        '## Capture context',
        'If checkout still fails, send the account ID, browser, plan, code, and screenshot to support.',
      ].join('\n'),
    },
  });

  await prisma.kbChunk.upsert({
    where: { id: 'seed-kb-discount-code-context' },
    update: {},
    create: {
      id: 'seed-kb-discount-code-context',
      articleId: article.id,
      workspaceId: workspace.id,
      heading: 'Capture context',
      body: 'If checkout still fails, send the account ID, browser, plan, code, and screenshot to support.',
      order: 0,
    },
  });

  const feedback = [
    {
      shortId: 'TR-DEMO01',
      submitterEmail: 'demo.customer@example.com',
      rawText:
        'The checkout page crashes when I apply a discount code on mobile Safari.',
      cleanedText:
        'Checkout crashes on mobile Safari after applying a discount code.',
      submissionType: 'bug' as const,
      category: 'checkout',
      severity: 'critical' as const,
      escalationTier: 'critical' as const,
      escalationReason:
        'Checkout is blocked for a paying account during plan upgrade.',
      sentiment: 'negative' as const,
      status: 'triaged' as const,
      isNoise: false,
      knowledgeGap: false,
      sourceUrl: 'http://localhost:3002/pricing',
      sourceTitle: 'Pricing',
      userContext: {
        email: 'demo.customer@example.com',
        name: 'Ada Demo',
        accountId: 'acct_demo_enterprise',
      },
      metadata: {
        plan: 'enterprise',
        environment: 'production',
        browser: 'Mobile Safari',
        affectedUsers: 14,
      },
    },
    {
      shortId: 'TR-DEMO02',
      submitterEmail: 'lee@example.com',
      rawText:
        'The docs mention webhook retries but do not say how long you keep retrying.',
      cleanedText:
        'Documentation does not explain webhook retry duration or retry schedule.',
      submissionType: 'question' as const,
      category: 'docs',
      severity: 'medium' as const,
      escalationTier: 'watch' as const,
      escalationReason:
        'The report is a knowledge-base gap, not an active outage.',
      sentiment: 'neutral' as const,
      status: 'new' as const,
      isNoise: false,
      knowledgeGap: true,
      sourceUrl: 'http://localhost:3002/docs/webhooks',
      sourceTitle: 'Webhook docs',
      userContext: { email: 'lee@example.com', accountId: 'acct_docs_demo' },
      metadata: { plan: 'growth', environment: 'production' },
    },
    {
      shortId: 'TR-DEMO03',
      submitterEmail: 'mira@example.com',
      rawText:
        'Please let teammates save filtered dashboard views for weekly review.',
      cleanedText:
        'Request to save shared filtered dashboard views for team review.',
      submissionType: 'idea' as const,
      category: 'dashboard',
      severity: 'low' as const,
      escalationTier: 'none' as const,
      sentiment: 'positive' as const,
      status: 'claimed' as const,
      isNoise: false,
      knowledgeGap: false,
      sourceUrl: 'http://localhost:3002/app',
      sourceTitle: 'Demo app',
      userContext: { email: 'mira@example.com', accountId: 'acct_ops_demo' },
      metadata: { plan: 'starter', environment: 'production' },
    },
    {
      shortId: 'TR-DEMO04',
      submitterEmail: 'spam@example.com',
      rawText: 'buy cheap watches click here http://spam.example',
      cleanedText: 'Spam submission rejected by intake filtering.',
      submissionType: 'custom' as const,
      escalationTier: 'none' as const,
      sentiment: 'negative' as const,
      status: 'rejected' as const,
      isNoise: true,
      knowledgeGap: false,
      sourceUrl: 'http://localhost:3002',
      sourceTitle: 'Widget playground',
      metadata: { reason: 'spam-pattern' },
    },
  ];

  for (const item of feedback) {
    await prisma.feedback.upsert({
      where: { shortId: item.shortId },
      update: {},
      create: {
        ...item,
        widgetId: widget.id,
        triagedAt: item.status === 'new' ? undefined : new Date(),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
