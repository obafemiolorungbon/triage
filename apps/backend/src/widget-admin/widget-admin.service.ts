import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  createWidgetSchema,
  patchWidgetSchema,
  type WidgetFieldInput,
  type WidgetThemeInput,
  type WidgetVariantInput,
} from '@triage/shared-types';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class WidgetAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async list() {
    const workspace = await this.settings.getWorkspace();
    return this.prisma.client.widget.findMany({
      where: { workspaceId: workspace.id },
      include: {
        theme: true,
        fields: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ archivedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(body: unknown) {
    const parsed = createWidgetSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const workspace = await this.settings.getWorkspace();
    return this.prisma.client.widget.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.data.name,
        allowedOrigins: parsed.data.allowedOrigins,
        devMode: parsed.data.devMode,
        identityVerificationRequired: parsed.data.identityVerificationRequired,
        rateLimitPerMinute: parsed.data.rateLimitPerMinute,
        configRateLimitPerMinute: parsed.data.configRateLimitPerMinute,
        requireConsent: parsed.data.requireConsent,
        privacyPolicyUrl: parsed.data.privacyPolicyUrl || null,
        consentText: parsed.data.consentText,
        brandColor: parsed.data.brandColor,
        accentColor: parsed.data.accentColor,
        position: parsed.data.position,
        size: parsed.data.size,
        title: parsed.data.title,
        description: parsed.data.description,
        successMessage: parsed.data.successMessage,
        enabledUserFields: parsed.data.enabledUserFields,
        requiredUserFields: parsed.data.requiredUserFields,
        enabledMetadataKeys: parsed.data.enabledMetadataKeys,
        maxAttachmentBytes: parsed.data.maxAttachmentBytes,
        allowedMimeTypes: parsed.data.allowedMimeTypes,
        maxAttachmentsPerSubmit: parsed.data.maxAttachmentsPerSubmit,
        enabledTypes: parsed.data.enabledTypes,
        surveyMode: parsed.data.surveyMode,
        pageRules: (parsed.data.pageRules ?? undefined) as Prisma.InputJsonValue | undefined,
        audienceRules: (parsed.data.audienceRules ?? undefined) as Prisma.InputJsonValue | undefined,
        triggerConfig: (parsed.data.triggerConfig ?? undefined) as Prisma.InputJsonValue | undefined,
        inlineEnabled: parsed.data.inlineEnabled,
        fields: { create: this.fieldCreates(parsed.data.fields) },
        variants: { create: this.variantCreates(parsed.data.variants) },
        theme: { create: this.themeCreate(parsed.data.theme) },
      },
      include: {
        theme: true,
        fields: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async get(id: string) {
    const widget = await this.prisma.client.widget.findUnique({
      where: { id },
      include: {
        theme: true,
        fields: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!widget) throw new NotFoundException('Widget not found');
    return widget;
  }

  async patch(id: string, body: unknown) {
    const parsed = patchWidgetSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    await this.get(id);
    const {
      archivedAt,
      fields,
      variants,
      theme,
      pageRules,
      audienceRules,
      triggerConfig,
      ...data
    } = parsed.data;
    return this.prisma.client.$transaction(async (tx) => {
      if (fields) {
        await tx.widgetField.deleteMany({ where: { widgetId: id } });
        if (fields.length > 0) {
          await tx.widgetField.createMany({
            data: this.fieldCreates(fields).map((field) => ({
              ...field,
              widgetId: id,
            })),
          });
        }
      }
      if (variants) {
        await tx.widgetVariant.deleteMany({ where: { widgetId: id } });
        if (variants.length > 0) {
          await tx.widgetVariant.createMany({
            data: this.variantCreates(variants).map((variant) => ({
              ...variant,
              widgetId: id,
            })),
          });
        }
      }
      if (theme) {
        await tx.widgetTheme.upsert({
          where: { widgetId: id },
          update: this.themeCreate(theme),
          create: { widgetId: id, ...this.themeCreate(theme) },
        });
      }
      return tx.widget.update({
        where: { id },
        data: {
          ...data,
          pageRules:
            pageRules === undefined
              ? undefined
              : (pageRules ?? undefined) as Prisma.InputJsonValue | undefined,
          audienceRules:
            audienceRules === undefined
              ? undefined
              : (audienceRules ?? undefined) as Prisma.InputJsonValue | undefined,
          triggerConfig:
            triggerConfig === undefined
              ? undefined
              : (triggerConfig ?? undefined) as Prisma.InputJsonValue | undefined,
          archivedAt:
            archivedAt === undefined
              ? undefined
              : archivedAt === null
                ? null
                : new Date(archivedAt),
        },
        include: {
          theme: true,
          fields: { orderBy: { order: 'asc' } },
          variants: { orderBy: { createdAt: 'asc' } },
        },
      });
    });
  }

  async archive(id: string) {
    await this.get(id);
    return this.prisma.client.widget.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: {
        theme: true,
        fields: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async rotateSecret(id: string) {
    await this.get(id);
    return this.prisma.client.widget.update({
      where: { id },
      data: { widgetSecret: this.makeSecret() },
      include: {
        theme: true,
        fields: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async duplicate(id: string) {
    const source = await this.get(id);
    return this.prisma.client.widget.create({
      data: {
        workspaceId: source.workspaceId,
        name: await this.nextCopyName(source.workspaceId, source.name),
        allowedOrigins: source.allowedOrigins,
        devMode: source.devMode,
        identityVerificationRequired: source.identityVerificationRequired,
        rateLimitPerMinute: source.rateLimitPerMinute,
        configRateLimitPerMinute: source.configRateLimitPerMinute,
        requireConsent: source.requireConsent,
        privacyPolicyUrl: source.privacyPolicyUrl,
        consentText: source.consentText,
        brandColor: source.brandColor,
        accentColor: source.accentColor,
        position: source.position,
        size: source.size,
        title: source.title,
        description: source.description,
        successMessage: source.successMessage,
        enabledUserFields: source.enabledUserFields,
        requiredUserFields: source.requiredUserFields,
        enabledMetadataKeys: source.enabledMetadataKeys,
        maxAttachmentBytes: source.maxAttachmentBytes,
        allowedMimeTypes: source.allowedMimeTypes,
        maxAttachmentsPerSubmit: source.maxAttachmentsPerSubmit,
        enabledTypes: source.enabledTypes,
        surveyMode: source.surveyMode,
        pageRules: source.pageRules as Prisma.InputJsonValue | undefined,
        audienceRules: source.audienceRules as Prisma.InputJsonValue | undefined,
        triggerConfig: source.triggerConfig as Prisma.InputJsonValue | undefined,
        inlineEnabled: source.inlineEnabled,
        fields: {
          create: this.fieldCreates(source.fields),
        },
        variants: {
          create: this.variantCreates(source.variants),
        },
        theme: {
          create: {
            logoUrl: source.theme?.logoUrl,
            surfaceColor: source.theme?.surfaceColor,
            textColor: source.theme?.textColor,
            fontFamily: source.theme?.fontFamily,
            borderRadius: source.theme?.borderRadius,
            shadow: source.theme?.shadow,
            launcherIcon: source.theme?.launcherIcon,
            launcherLabel: source.theme?.launcherLabel,
            darkMode: source.theme?.darkMode,
            poweredBy: source.theme?.poweredBy,
            successAnimation: source.theme?.successAnimation,
            customCss: source.theme?.customCss,
          },
        },
      },
      include: {
        theme: true,
        fields: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  private makeSecret() {
    return `wsec_${randomUUID().replace(/-/g, '')}`;
  }

  private async nextCopyName(workspaceId: string, name: string) {
    const base = `${name} copy`;
    const existing = await this.prisma.client.widget.findMany({
      where: { workspaceId, name: { startsWith: base } },
      select: { name: true },
    });
    if (!existing.some((w) => w.name === base)) return base;
    return `${base} ${existing.length + 1}`;
  }

  private fieldCreates(fields: WidgetFieldInput[]) {
    const source = fields.length > 0 ? fields : this.defaultFields();
    return source.map((field, index) => ({
      key: this.slug(field.key || field.label),
      label: field.label,
      kind: field.kind,
      required: field.required,
      placeholder: field.placeholder ?? null,
      helpText: field.helpText ?? null,
      validation: (field.validation ?? undefined) as Prisma.InputJsonValue | undefined,
      options: (field.options ?? undefined) as Prisma.InputJsonValue | undefined,
      visibleWhen: (field.visibleWhen ?? undefined) as Prisma.InputJsonValue | undefined,
      target: field.target,
      order: field.order ?? index * 10,
    }));
  }

  private variantCreates(variants: WidgetVariantInput[]) {
    return variants
      .filter((variant) => variant.name.trim())
      .map((variant) => ({
        name: variant.name.trim(),
        weight: variant.weight,
        brandColor: variant.brandColor || null,
        launcherLabel: variant.launcherLabel || null,
        enabled: variant.enabled,
      }));
  }

  private themeCreate(theme: Partial<WidgetThemeInput> | undefined) {
    return {
      logoUrl: theme?.logoUrl ?? null,
      surfaceColor: theme?.surfaceColor ?? undefined,
      textColor: theme?.textColor ?? undefined,
      fontFamily: theme?.fontFamily ?? undefined,
      borderRadius: theme?.borderRadius ?? undefined,
      shadow: theme?.shadow ?? undefined,
      launcherIcon: theme?.launcherIcon ?? undefined,
      launcherLabel: theme?.launcherLabel ?? undefined,
      darkMode: theme?.darkMode ?? undefined,
      poweredBy: theme?.poweredBy ?? undefined,
      successAnimation: theme?.successAnimation ?? undefined,
      customCss: sanitizeCustomCss(theme?.customCss),
    };
  }

  private defaultFields(): WidgetFieldInput[] {
    return [
      {
        key: 'title',
        label: 'Title',
        kind: 'text',
        required: false,
        placeholder: 'Short summary',
        target: 'title',
        order: 10,
      },
      {
        key: 'message',
        label: 'Feedback',
        kind: 'textarea',
        required: true,
        placeholder: 'Tell us what happened or what could be better.',
        target: 'message',
        order: 20,
      },
    ];
  }

  private slug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  }
}

function sanitizeCustomCss(value: string | null | undefined) {
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
