import { feedbackCategorySchema } from '@triage/shared-types';

const categoryList = feedbackCategorySchema.options.join(', ');

export function spamPrompt(text: string): string {
  return `Classify whether the following user feedback is spam/noise (not actionable product feedback). Be conservative: genuine bug reports, complaints, and feature requests are NOT noise.\n\n---\n${text}\n---`;
}

export function triagePrompt(
  text: string,
  opts: { industryContext?: string; companyContext?: string },
): string {
  const industry =
    opts.industryContext?.trim() || 'general SaaS customer support';
  const companyContext = opts.companyContext?.trim()
    ? `\nCompany context:\n${opts.companyContext.trim()}\n`
    : '';
  return `You triage customer support feedback for ${industry}.${companyContext}

Return:
- category: ONE of [${categoryList}] that best fits the ticket.
- sentiment: one of [negative, neutral, positive].
- knowledgeGap: true when the question reveals a docs/help-center gap.
- cleanedText: the ticket text with typos fixed and formatting tidied (preserve meaning).
- suggestedTags: up to five short, lower-case tags for search.
- issueTitle: optional concise issue title suitable for Linear/Jira.
- issueBody: optional structured issue body for an engineering or support backlog.

Feedback:
---
${text}
---`;
}
