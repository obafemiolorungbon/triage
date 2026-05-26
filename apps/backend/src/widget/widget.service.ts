import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import {
  widgetFeedbackBodySchema,
  widgetSurveyBodySchema,
  widgetUploadUrlBodySchema,
  type WidgetAttachmentSubmission,
} from '@triage/shared-types';
import type { Widget } from '@prisma/client';
import { FeedbackService } from '../feedback/feedback.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { sanitizeWidgetFeedback } from './sanitize';

@Injectable()
export class WidgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedback: FeedbackService,
    private readonly storage: StorageService,
  ) {}

  async resolveByKey(widgetKey: string) {
    const widget = await this.prisma.client.widget.findUnique({
      where: { widgetKey },
      include: {
        theme: true,
        fields: { orderBy: { order: 'asc' } },
        variants: { where: { enabled: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!widget || widget.archivedAt) {
      throw new BadRequestException('Invalid widget key');
    }
    return widget;
  }

  async publicConfig(widgetKey: string) {
    const widget = await this.resolveByKey(widgetKey);
    return {
      id: widget.id,
      widgetKey: widget.widgetKey,
      name: widget.name,
      brandColor: widget.brandColor,
      accentColor: widget.accentColor,
      position: widget.position,
      size: widget.size,
      title: widget.title,
      description: widget.description,
      successMessage: widget.successMessage,
      enabledUserFields: widget.enabledUserFields,
      requiredUserFields: widget.requiredUserFields,
      enabledMetadataKeys: widget.enabledMetadataKeys,
      maxAttachmentBytes: widget.maxAttachmentBytes,
      allowedMimeTypes: widget.allowedMimeTypes,
      maxAttachmentsPerSubmit: widget.maxAttachmentsPerSubmit,
      enabledTypes: widget.enabledTypes,
      surveyMode: widget.surveyMode,
      pageRules: widget.pageRules,
      audienceRules: widget.audienceRules,
      triggerConfig: widget.triggerConfig,
      inlineEnabled: widget.inlineEnabled,
      requireConsent: widget.requireConsent,
      privacyPolicyUrl: widget.privacyPolicyUrl,
      consentText: widget.consentText,
      variants: widget.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        weight: variant.weight,
        brandColor: variant.brandColor,
        launcherLabel: variant.launcherLabel,
      })),
      fields: widget.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        kind: field.kind,
        required: field.required,
        placeholder: field.placeholder,
        helpText: field.helpText,
        validation: field.validation,
        options: field.options,
        visibleWhen: field.visibleWhen,
        target: field.target,
        order: field.order,
      })),
      theme: widget.theme
        ? { ...widget.theme, customCss: sanitizePublicCss(widget.theme.customCss) }
        : null,
    };
  }

  async submit(body: unknown, req?: Request) {
    const parsed = widgetFeedbackBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const widget = await this.resolveByKey(parsed.data.widgetKey);
    if (parsed.data.website?.trim()) {
      throw new BadRequestException('Invalid submission');
    }
    if (widget.requireConsent && !parsed.data.consentAccepted) {
      throw new BadRequestException('Consent is required');
    }
    this.assertVerifiedIdentity(widget, parsed.data);
    if (parsed.data.survey) this.assertSurveyAllowed(widget, parsed.data.survey.scale);
    const sanitized = sanitizeWidgetFeedback(parsed.data);
    await this.validateSubmittedAttachments(widget, sanitized.payload.attachments);
    const consent = widget.requireConsent
      ? {
          version: 'v1',
          text: widget.consentText,
          privacyPolicyUrl: widget.privacyPolicyUrl,
          acceptedAt: new Date().toISOString(),
          ip: this.clientIp(req),
          ua: req?.headers['user-agent'] ?? null,
        }
      : undefined;
    const ticket = await this.feedback.createWidgetTicket(
      sanitized.payload,
      widget.id,
      consent,
    );
    if (sanitized.redacted) {
      await this.prisma.client.auditLog.create({
        data: {
          feedbackId: ticket.id,
          action: 'widget_redacted',
          after: {
            widgetId: widget.id,
            reason: 'Sensitive values were redacted before persistence',
          },
        },
      });
    }
    return ticket;
  }

  async createUploadUrl(body: unknown) {
    const parsed = widgetUploadUrlBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const widget = await this.resolveByKey(parsed.data.widgetKey);
    this.assertImageAllowed(widget, {
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
    });
    return this.storage.createUploadUrl({
      widgetId: widget.id,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
    });
  }

  async submitSurvey(body: unknown) {
    const parsed = widgetSurveyBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const widget = await this.resolveByKey(parsed.data.widgetKey);
    const scale = parsed.data.survey.scale;
    this.assertSurveyAllowed(widget, scale);
    const survey = await this.prisma.client.survey.create({
      data: {
        widgetId: widget.id,
        feedbackId: parsed.data.feedbackId,
        score: parsed.data.survey.score,
        scale,
        comment: parsed.data.survey.comment,
      },
    });
    return { id: survey.id };
  }

  private async validateSubmittedAttachments(
    widget: Widget,
    attachments: WidgetAttachmentSubmission[],
  ) {
    if (attachments.length > widget.maxAttachmentsPerSubmit) {
      throw new BadRequestException(
        `Attach up to ${widget.maxAttachmentsPerSubmit} images`,
      );
    }
    const uniqueStorageKeys = new Set(
      attachments.map((attachment) => attachment.storageKey),
    );
    if (uniqueStorageKeys.size !== attachments.length) {
      throw new BadRequestException('Duplicate attachments are not allowed');
    }
    for (const attachment of attachments) {
      this.assertImageAllowed(widget, attachment);
      if (!attachment.storageKey.startsWith(`widgets/${widget.id}/`)) {
        throw new BadRequestException('Attachment does not belong to this widget');
      }
      const head = await this.storage.headObject(attachment.storageKey);
      if (head.ContentLength && head.ContentLength !== attachment.sizeBytes) {
        throw new BadRequestException('Attachment size does not match upload');
      }
      if (head.ContentType && head.ContentType !== attachment.mimeType) {
        throw new BadRequestException('Attachment type does not match upload');
      }
    }
  }

  private assertImageAllowed(
    widget: Widget,
    attachment: { mimeType: string; sizeBytes: number },
  ) {
    if (!attachment.mimeType.startsWith('image/')) {
      throw new BadRequestException('Only image attachments are supported');
    }
    if (!widget.allowedMimeTypes.includes(attachment.mimeType)) {
      throw new BadRequestException(`Unsupported image type: ${attachment.mimeType}`);
    }
    if (attachment.sizeBytes > widget.maxAttachmentBytes) {
      throw new BadRequestException(
        `Image must be ${Math.round(widget.maxAttachmentBytes / 1024 / 1024)}MB or smaller`,
      );
    }
  }

  private assertSurveyAllowed(widget: { surveyMode: string }, scale: string) {
    if (widget.surveyMode === 'none') {
      throw new BadRequestException('Survey is not enabled for this widget');
    }
    if (
      (widget.surveyMode === 'csat' && scale !== 'csat_5') ||
      (widget.surveyMode === 'nps' && scale !== 'nps_10') ||
      (widget.surveyMode === 'thumbs' && scale !== 'thumbs')
    ) {
      throw new BadRequestException('Survey scale is not enabled for this widget');
    }
  }

  private assertVerifiedIdentity(
    widget: { identityVerificationRequired: boolean; widgetSecret: string },
    body: { user?: Record<string, unknown>; userHash?: string },
  ) {
    if (!widget.identityVerificationRequired) return;
    const identifier = this.identityIdentifier(body.user);
    if (!identifier || !body.userHash) {
      throw new UnauthorizedException('Verified user identity is required');
    }
    const expected = createHmac('sha256', widget.widgetSecret)
      .update(identifier)
      .digest('hex');
    if (!this.safeEqual(expected, body.userHash)) {
      throw new UnauthorizedException('Verified user identity is required');
    }
  }

  private identityIdentifier(user: Record<string, unknown> | undefined) {
    if (!user) return null;
    if (typeof user.email === 'string' && user.email.trim()) {
      return user.email.trim().toLowerCase();
    }
    if (typeof user.id === 'string' && user.id.trim()) {
      return user.id.trim();
    }
    if (typeof user.id === 'number') {
      return String(user.id);
    }
    return null;
  }

  private safeEqual(expected: string, received: string) {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(received, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private clientIp(req: Request | undefined) {
    if (!req) return null;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
      return forwarded[0].split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || null;
  }
}

function sanitizePublicCss(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const sanitized = value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@import[^;]+;?/gi, '')
    .replace(/@font-face\s*{[\s\S]*?}/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/url\s*\(\s*(['"]?)\s*javascript:[^)]+\)/gi, '')
    .replace(/\bbehavior\s*:[^;]+;?/gi, '')
    .replace(/\b-moz-binding\s*:[^;]+;?/gi, '')
    .slice(0, 10_000)
    .trim();
  return sanitized || null;
}
