import { feedbackCategorySchema } from '@triage/shared-types';

const categoryList = feedbackCategorySchema.options.join(', ');

export function spamPrompt(text: string): string {
  return `Classify whether the following user feedback is spam/noise (not actionable product feedback). Be conservative: genuine bug reports, complaints, and feature requests are NOT noise.\n\n---\n${text}\n---`;
}

export function triagePrompt(
  text: string,
  opts: { industryContext?: string },
): string {
  const industry =
    opts.industryContext?.trim() || 'general SaaS customer support';
  return `You triage customer support feedback for ${industry}.

Return:
- category: ONE of [${categoryList}] that best fits the ticket.
- priority: one of [low, med, high, urgent] reflecting customer impact and urgency.
- sentiment: one of [negative, neutral, positive].
- knowledgeGap: true when the question reveals a docs/help-center gap.
- cleanedText: the ticket text with typos fixed and formatting tidied (preserve meaning).
- suggestedTags: up to five short, lower-case tags for search.

Feedback:
---
${text}
---`;
}
