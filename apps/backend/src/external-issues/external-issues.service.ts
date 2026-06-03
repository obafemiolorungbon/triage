import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ExternalIssueCreationMode,
  ExternalIssueProvider,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type IssueDraft = {
  title?: string | null;
  body?: string | null;
};

type IssueSection = {
  title: string;
  body?: string;
  bullets?: string[];
  code?: string;
  codeLanguage?: string;
};

type IssueDocument = {
  title: string;
  markdown: string;
  sections: IssueSection[];
};

type JiraNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JiraNode[];
  text?: string;
};

const feedbackIssueInclude = Prisma.validator<Prisma.FeedbackInclude>()({
  comments: {
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  },
  attachments: { orderBy: { createdAt: 'asc' } },
  surveys: { orderBy: { createdAt: 'asc' } },
});

type FeedbackForIssue = Prisma.FeedbackGetPayload<{
  include: typeof feedbackIssueInclude;
}>;

@Injectable()
export class ExternalIssuesService {
  constructor(private readonly prisma: PrismaService = new PrismaService()) {}

  status() {
    return {
      linear: {
        configured: Boolean(
          process.env.LINEAR_API_KEY && process.env.LINEAR_TEAM_ID,
        ),
      },
      jira: {
        configured: Boolean(
          process.env.JIRA_BASE_URL &&
            process.env.JIRA_EMAIL &&
            process.env.JIRA_API_TOKEN &&
            process.env.JIRA_PROJECT_KEY,
        ),
      },
    };
  }

  async createForFeedback(params: {
    feedbackId: string;
    provider: ExternalIssueProvider;
    creationMode: ExternalIssueCreationMode;
    draft?: IssueDraft;
  }) {
    const existing = await this.prisma.client.externalIssueLink.findUnique({
      where: {
        feedbackId_provider: {
          feedbackId: params.feedbackId,
          provider: params.provider,
        },
      },
    });
    if (existing) return existing;

    const feedback = await this.prisma.client.feedback.findUnique({
      where: { id: params.feedbackId },
      include: feedbackIssueInclude,
    });
    if (!feedback) throw new BadRequestException('Feedback not found');

    const result =
      params.provider === 'linear'
        ? await this.createLinear(feedback, params.draft)
        : await this.createJira(feedback, params.draft);

    return this.prisma.client.externalIssueLink.create({
      data: {
        feedbackId: params.feedbackId,
        provider: params.provider,
        externalId: result.id,
        externalKey: result.key ?? null,
        externalUrl: result.url,
        creationMode: params.creationMode,
      },
    });
  }

  private buildIssue(feedback: FeedbackForIssue, draft?: IssueDraft): IssueDocument {
    const structured = this.buildStructuredIssue(feedback);
    const title = draft?.title?.trim() || structured.title;
    const body = draft?.body?.trim();
    if (!body) {
      return { ...structured, title: title.slice(0, 180) };
    }
    return {
      title: title.slice(0, 180),
      markdown: body,
      sections: [{ title: 'Triage handoff', body }],
    };
  }

  private buildStructuredIssue(feedback: FeedbackForIssue): IssueDocument {
    const reference = feedback.shortId || feedback.id.slice(0, 8);
    const category = sentenceCase(
      feedback.category ?? feedback.submissionType ?? 'feedback',
    );
    const summary = summarize(feedback.cleanedText ?? feedback.rawText);
    const title = `[${reference}] ${category}: ${summary}`.slice(0, 180);
    const action = [
      'Investigate this customer feedback and update the linked ticket with an owner,',
      'decision or reproduction notes, and the next customer-facing step.',
    ].join(' ');

    const sections: IssueSection[] = [
      {
        title: 'Action requested',
        bullets: [
          action,
          `Triage ticket: ${reference}`,
          `Current status: ${feedback.status}`,
          `Escalation: ${feedback.escalationTier}`,
          `Submitter: ${feedback.submitterEmail}`,
        ],
      },
      {
        title: 'Triage facts',
        bullets: [
          `Category: ${formatNullable(feedback.category)}`,
          `Submission type: ${formatNullable(feedback.submissionType)}`,
          `Severity: ${formatNullable(feedback.severity)}`,
          `Sentiment: ${formatNullable(feedback.sentiment)}`,
          `Knowledge gap: ${formatBoolean(feedback.knowledgeGap)}`,
          `Noise: ${formatBoolean(feedback.isNoise)}`,
          `Assigned agent: ${formatNullable(feedback.assignedAgentId)}`,
          `Created: ${formatDate(feedback.createdAt)}`,
          `Triaged: ${formatDate(feedback.triagedAt)}`,
          `Resolved: ${formatDate(feedback.resolvedAt)}`,
        ],
      },
      {
        title: 'Escalation reason',
        body: feedback.escalationReason || 'No escalation reason captured.',
      },
      {
        title: 'Customer feedback',
        body: feedback.cleanedText ?? feedback.rawText,
      },
      {
        title: 'Original submission',
        code: feedback.rawText || 'No raw feedback captured.',
      },
      {
        title: 'Source',
        bullets: [
          `Page title: ${formatNullable(feedback.sourceTitle)}`,
          `URL: ${formatNullable(feedback.sourceUrl)}`,
        ],
      },
      {
        title: 'Internal comments',
        bullets:
          feedback.comments.length > 0
            ? feedback.comments.map((comment) => {
                const author =
                  comment.author?.name ||
                  comment.author?.email ||
                  comment.authorId.slice(0, 8);
                return `${formatDate(comment.createdAt)} - ${author}: ${comment.body}`;
              })
            : ['No internal comments yet.'],
      },
      {
        title: 'Attachments',
        bullets:
          feedback.attachments.length > 0
            ? feedback.attachments.map((attachment) =>
                [
                  attachment.fileName || attachment.id,
                  attachment.mimeType,
                  `${Math.round(attachment.sizeBytes / 1024)}KB`,
                  attachment.width && attachment.height
                    ? `${attachment.width}x${attachment.height}`
                    : null,
                  `attachmentId: ${attachment.id}`,
                ]
                  .filter(Boolean)
                  .join(' | '),
              )
            : ['No attachments.'],
      },
      {
        title: 'Survey responses',
        bullets:
          feedback.surveys.length > 0
            ? feedback.surveys.map((survey) =>
                [
                  `${survey.scale}: ${survey.score}`,
                  survey.comment ? `comment: ${survey.comment}` : null,
                  `submitted: ${formatDate(survey.createdAt)}`,
                ]
                  .filter(Boolean)
                  .join(' | '),
              )
            : ['No survey response linked.'],
      },
      {
        title: 'User context',
        code: jsonBlock(feedback.userContext),
        codeLanguage: 'json',
      },
      {
        title: 'Metadata',
        code: jsonBlock(feedback.metadata),
        codeLanguage: 'json',
      },
      {
        title: 'Consent',
        code: jsonBlock(feedback.consent),
        codeLanguage: 'json',
      },
    ];

    return {
      title,
      markdown: this.sectionsToMarkdown(sections),
      sections,
    };
  }

  private sectionsToMarkdown(sections: IssueSection[]) {
    return sections
      .map((section) => {
        const lines = [`## ${section.title}`];
        if (section.body) lines.push('', section.body);
        if (section.bullets?.length) {
          lines.push('', ...section.bullets.map((item) => `- ${item}`));
        }
        if (section.code) {
          lines.push(
            '',
            `\`\`\`${section.codeLanguage ?? ''}`,
            limitText(section.code, 8_000),
            '```',
          );
        }
        return lines.join('\n');
      })
      .join('\n\n');
  }

  private sectionsToJiraDocument(sections: IssueSection[]) {
    const content: JiraNode[] = [];
    for (const section of sections) {
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: section.title }],
      });
      if (section.body) content.push(paragraph(section.body));
      if (section.bullets?.length) {
        content.push({
          type: 'bulletList',
          content: section.bullets.map((item) => ({
            type: 'listItem',
            content: [paragraph(item)],
          })),
        });
      }
      if (section.code) {
        content.push({
          type: 'codeBlock',
          attrs: section.codeLanguage ? { language: section.codeLanguage } : {},
          content: [{ type: 'text', text: limitText(section.code, 8_000) }],
        });
      }
    }
    return { type: 'doc', version: 1, content };
  }

  private async createLinear(feedback: FeedbackForIssue, draft?: IssueDraft) {
    const apiKey = process.env.LINEAR_API_KEY;
    const teamId = process.env.LINEAR_TEAM_ID;
    const projectId = process.env.LINEAR_PROJECT_ID;
    if (!apiKey || !teamId) {
      throw new BadRequestException('Linear is not configured');
    }
    const issue = this.buildIssue(feedback, draft);
    const query = `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }
    `;
    const variables = {
      input: {
        teamId,
        projectId: projectId || undefined,
        title: issue.title,
        description: limitText(issue.markdown, 30_000),
      },
    };
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as {
      data?: { issueCreate?: { success?: boolean; issue?: { id: string; identifier: string; url: string } } };
      errors?: unknown;
    };
    const created = json.data?.issueCreate?.issue;
    if (!res.ok || !json.data?.issueCreate?.success || !created) {
      throw new BadRequestException('Linear issue creation failed');
    }
    return { id: created.id, key: created.identifier, url: created.url };
  }

  private async createJira(feedback: FeedbackForIssue, draft?: IssueDraft) {
    const baseUrl = (process.env.JIRA_BASE_URL ?? '').replace(/\/$/, '');
    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;
    const projectKey = process.env.JIRA_PROJECT_KEY;
    const issueType = process.env.JIRA_ISSUE_TYPE;
    if (!baseUrl || !email || !token || !projectKey) {
      throw new BadRequestException('Jira is not configured');
    }
    const issue = this.buildIssue(feedback, draft);
    const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: issue.title,
          issuetype: { name: issueType || 'Task' },
          description: this.sectionsToJiraDocument(issue.sections),
        },
      }),
    });
    const json = (await res.json()) as { id?: string; key?: string; self?: string };
    if (!res.ok || !json.id || !json.key) {
      throw new BadRequestException('Jira issue creation failed');
    }
    return {
      id: json.id,
      key: json.key,
      url: `${baseUrl}/browse/${json.key}`,
    };
  }
}

function paragraph(text: string): JiraNode {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text: limitText(text, 8_000) }],
  };
}

function summarize(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No feedback text captured';
  return normalized.length > 92 ? `${normalized.slice(0, 89)}...` : normalized;
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ');
}

function formatNullable(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not set';
  return String(value);
}

function formatBoolean(value: boolean) {
  return value ? 'Yes' : 'No';
}

function formatDate(value: Date | null) {
  return value ? value.toISOString() : 'Not set';
}

function jsonBlock(value: unknown) {
  if (value === null || value === undefined) return 'Not captured';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function limitText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 18)}\n...[truncated]`;
}
