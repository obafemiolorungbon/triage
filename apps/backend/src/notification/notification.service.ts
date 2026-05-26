import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class NotificationService {
  private readonly log = new Logger(NotificationService.name);
  private readonly resend: Resend | null;

  constructor() {
    const key = process.env.RESEND_API_KEY;
    this.resend = key ? new Resend(key) : null;
  }

  async sendPlain(params: { to: string; subject: string; text: string }) {
    const from = process.env.RESEND_FROM;
    if (!this.resend || !from) {
      this.log.debug('Resend not configured; skipping email');
      return;
    }
    await this.resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
  }

  async notifyFeedbackTriaged(params: {
    to: string;
    feedbackId: string;
    category: string | null;
    escalationTier: string | null;
  }) {
    const from = process.env.RESEND_FROM;
    if (!this.resend || !from) {
      this.log.debug('Resend not configured; skipping email');
      return;
    }
    await this.resend.emails.send({
      from,
      to: params.to,
      subject: 'We received your feedback',
      html: `<p>Thanks for your submission. Our team is reviewing it.</p>
        <p><strong>Reference:</strong> ${params.feedbackId}</p>
        <p><strong>Category:</strong> ${params.category ?? '-'}</p>
        <p><strong>Escalation:</strong> ${params.escalationTier ?? 'none'}</p>`,
    });
  }

  async notifyAgentAssigned(params: {
    agentEmail: string;
    feedbackId: string;
    summary: string;
  }) {
    const from = process.env.RESEND_FROM;
    if (!this.resend || !from) {
      this.log.debug('Resend not configured; skipping agent email');
      return;
    }
    await this.resend.emails.send({
      from,
      to: params.agentEmail,
      subject: `New ticket assigned: ${params.feedbackId}`,
      text: `You have been assigned feedback ${params.feedbackId}.\n\n${params.summary}`,
    });
  }

  async postSlack(text: string) {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  }
}
