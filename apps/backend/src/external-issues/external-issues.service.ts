import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ExternalIssueCreationMode,
  ExternalIssueProvider,
  Feedback,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type IssueDraft = {
  title?: string | null;
  body?: string | null;
};

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

  private buildIssue(feedback: Feedback, draft?: IssueDraft) {
    const title =
      draft?.title?.trim() ||
      `${feedback.category ?? 'Feedback'}: ${feedback.rawText.split(/\s+/).slice(0, 10).join(' ')}`;
    const body =
      draft?.body?.trim() ||
      [
        `Escalation: ${feedback.escalationTier}`,
        feedback.escalationReason && `Reason: ${feedback.escalationReason}`,
        feedback.category && `Category: ${feedback.category}`,
        feedback.sentiment && `Sentiment: ${feedback.sentiment}`,
        feedback.sourceUrl && `Source: ${feedback.sourceUrl}`,
        '',
        'Cleaned feedback:',
        feedback.cleanedText ?? feedback.rawText,
        '',
        'Raw feedback:',
        feedback.rawText,
        '',
        `Submitter: ${feedback.submitterEmail}`,
        feedback.userContext && `User context: ${JSON.stringify(feedback.userContext, null, 2)}`,
        feedback.metadata && `Metadata: ${JSON.stringify(feedback.metadata, null, 2)}`,
      ]
        .filter(Boolean)
        .join('\n');
    return { title: title.slice(0, 180), body };
  }

  private async createLinear(feedback: Feedback, draft?: IssueDraft) {
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
        description: issue.body,
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

  private async createJira(feedback: Feedback, draft?: IssueDraft) {
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
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: issue.body.slice(0, 30_000) }],
              },
            ],
          },
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
