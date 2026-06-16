export const INTAKE_QUEUE = 'intake-queue';
export const TRIAGE_QUEUE = 'triage-queue';
export const FEEDBACK_INDEX_QUEUE = 'feedback-index-queue';

export type IntakeJobData = { feedbackId: string };
export type TriageJobData = { feedbackId: string };
export type FeedbackIndexJobData = { feedbackId: string };
