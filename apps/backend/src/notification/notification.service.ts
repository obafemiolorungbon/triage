import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { Env } from '../config/env.schema';

@Injectable()
export class NotificationService {
  private readonly log = new Logger(NotificationService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: ConfigService<Env, true>) {
    const key = config.get('RESEND_API_KEY', { infer: true });
    this.resend = key ? new Resend(key) : null;
  }

  async sendPlain(params: { to: string; subject: string; text: string }) {
    const from = this.config.get('RESEND_FROM', { infer: true });
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
    priority: string | null;
  }) {
    const from = this.config.get('RESEND_FROM', { infer: true });
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
        <p><strong>Category:</strong> ${params.category ?? '—'}</p>
        <p><strong>Priority:</strong> ${params.priority ?? '—'}</p>`,
    });
  }

  async notifyAgentAssigned(params: {
    agentEmail: string;
    feedbackId: string;
    summary: string;
  }) {
    const from = this.config.get('RESEND_FROM', { infer: true });
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
