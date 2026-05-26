'use client';

import type { WidgetDto } from '@triage/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { browserTicketsClient } from '../../../../lib/tickets-browser-client';
import { ColorPaletteField } from '../color-palettes';

function csv(value: string[]) {
  return value.join(', ');
}

function fromCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const FIELD_KINDS = [
  'text',
  'textarea',
  'email',
  'url',
  'number',
  'select',
  'multiselect',
  'checkbox',
  'rating',
] as const;

const FIELD_TARGETS = [
  'user',
  'metadata',
  'message',
  'title',
  'category',
  'severity',
] as const;

const SUBMISSION_TYPES = ['bug', 'idea', 'question', 'praise', 'custom'] as const;
const POSITIONS = [
  'bottom-right',
  'bottom-left',
  'bottom-center',
  'top-right',
  'top-left',
  'side-tab-right',
  'side-tab-left',
] as const;
const SHADOWS = ['none', 'soft', 'deep'] as const;
const DARK_MODES = ['auto', 'light', 'dark'] as const;
const SUCCESS_ANIMATIONS = ['check', 'thumbs-up', 'none'] as const;

type WidgetThemeDraft = {
  logoUrl: string | null;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  shadow: string;
  launcherIcon: string;
  launcherLabel: string;
  darkMode: typeof DARK_MODES[number];
  poweredBy: boolean;
  successAnimation: typeof SUCCESS_ANIMATIONS[number];
  customCss: string | null;
};

export default function WidgetEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const client = browserTicketsClient();
  const queryClient = useQueryClient();
  const widgetQuery = useQuery({
    queryKey: ['widget', id],
    queryFn: () => client.getWidget(id),
  });
  const [draft, setDraft] = useState<WidgetDto | null>(null);

  useEffect(() => {
    if (widgetQuery.data) setDraft(widgetQuery.data);
  }, [widgetQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Widget is not loaded');
      return client.updateWidget(id, {
        name: draft.name,
        allowedOrigins: draft.allowedOrigins,
        devMode: draft.devMode,
        identityVerificationRequired: draft.identityVerificationRequired,
        rateLimitPerMinute: draft.rateLimitPerMinute,
        configRateLimitPerMinute: draft.configRateLimitPerMinute,
        requireConsent: draft.requireConsent,
        privacyPolicyUrl: draft.privacyPolicyUrl ?? null,
        consentText: draft.consentText,
        brandColor: draft.brandColor,
        accentColor: draft.accentColor,
        position: draft.position,
        size: draft.size,
        title: draft.title,
        description: draft.description,
        successMessage: draft.successMessage,
        enabledUserFields: draft.enabledUserFields,
        requiredUserFields: draft.requiredUserFields,
        enabledMetadataKeys: draft.enabledMetadataKeys,
        maxAttachmentBytes: draft.maxAttachmentBytes,
        allowedMimeTypes: draft.allowedMimeTypes,
        maxAttachmentsPerSubmit: draft.maxAttachmentsPerSubmit,
        enabledTypes: draft.enabledTypes,
        surveyMode: draft.surveyMode,
        pageRules: draft.pageRules ?? null,
        audienceRules: draft.audienceRules ?? null,
        triggerConfig: draft.triggerConfig ?? null,
        inlineEnabled: draft.inlineEnabled ?? true,
        theme: themePayload(draft),
        fields: (draft.fields ?? []).map((field, index) => ({
          ...field,
          order: index * 10,
          options: field.options ?? null,
          validation: field.validation ?? null,
          visibleWhen: field.visibleWhen ?? null,
        })),
        variants: (draft.variants ?? []).map((variant) => ({
          name: variant.name,
          weight: variant.weight,
          brandColor: variant.brandColor ?? null,
          launcherLabel: variant.launcherLabel ?? null,
          enabled: variant.enabled,
        })) as WidgetDto['variants'],
      });
    },
    onSuccess: (next) => {
      setDraft(next);
      void queryClient.invalidateQueries({ queryKey: ['widgets'] });
      void queryClient.invalidateQueries({ queryKey: ['widget', id] });
    },
  });

  const rotateMutation = useMutation({
    mutationFn: () => client.rotateWidgetSecret(id),
    onSuccess: (next) => setDraft(next),
  });

  if (widgetQuery.isLoading || !draft) {
    return (
      <div className="flex justify-center py-24">
        <span className="spinner" />
      </div>
    );
  }

  if (widgetQuery.isError) {
    return <div className="surface rounded-2xl p-6 text-[#F0A49A]">Widget not found.</div>;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/dashboard/widgets" className="btn-ghost">
        Back to widgets
      </Link>
      <header>
          <h1 className="text-4xl font-semibold tracking-tightest text-paper-50 md:text-5xl">
          {draft.name}
        </h1>
        <p className="mt-2 text-sm text-paper-400">
          Configure branding, embed identity, and optional user context fields.
        </p>
      </header>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Identity" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Name">
            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="Widget key">
            <input className="input font-mono" value={draft.widgetKey} readOnly />
          </Field>
        </div>
        <Field label="Embed snippet">
          <textarea
            className="textarea min-h-28 font-mono !text-xs"
            readOnly
            value={`<script src="http://localhost:3000/embed.js" data-widget-key="${draft.widgetKey}" async></script>`}
          />
        </Field>
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <Field label="Widget secret">
            <input className="input font-mono" value={draft.widgetSecret} readOnly />
          </Field>
          <button
            type="button"
            className="btn-secondary"
            disabled={rotateMutation.isPending}
            onClick={() => rotateMutation.mutate()}
          >
            Rotate secret
          </button>
        </div>
      </section>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Security" />
        <Field label="Allowed origins">
          <textarea
            className="textarea min-h-28 font-mono !text-xs"
            value={(draft.allowedOrigins ?? []).join('\n')}
            placeholder={'https://acme.com\nhttps://*.acme.com'}
            onChange={(e) =>
              setDraft({
                ...draft,
                allowedOrigins: e.target.value
                  .split('\n')
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
          <span className="text-xs text-paper-500">
            Leave empty to allow any origin. Localhost is allowed with configured origins only when dev mode is on.
          </span>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg bg-paper-100/[0.04] px-3 py-2 text-sm text-paper-200">
            <input
              type="checkbox"
              checked={draft.devMode}
              onChange={(e) => setDraft({ ...draft, devMode: e.target.checked })}
            />
            Dev mode allows localhost origins
          </label>
          <label className="flex items-center gap-3 rounded-lg bg-paper-100/[0.04] px-3 py-2 text-sm text-paper-200">
            <input
              type="checkbox"
              checked={draft.identityVerificationRequired}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  identityVerificationRequired: e.target.checked,
                })
              }
            />
            Require signed user identity
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Submission rate limit / minute">
            <input
              className="input"
              type="number"
              min={1}
              max={1000}
              value={draft.rateLimitPerMinute}
              onChange={(e) =>
                setDraft({ ...draft, rateLimitPerMinute: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Config rate limit / minute">
            <input
              className="input"
              type="number"
              min={1}
              max={5000}
              value={draft.configRateLimitPerMinute}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  configRateLimitPerMinute: Number(e.target.value),
                })
              }
            />
          </Field>
        </div>
        <div className="rounded-xl border border-paper-100/10 bg-paper-100/[0.025] p-4 text-xs leading-5 text-paper-400">
          Sign identified users with hex HMAC-SHA256 using the widget secret and
          the lowercased email address, or user id when email is missing. Pass it
          as <span className="font-mono text-paper-200">data-user-hash</span> or
          the third argument to <span className="font-mono text-paper-200">TriageWidget.identify</span>.
        </div>
      </section>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Consent" />
        <label className="flex items-center gap-3 rounded-lg bg-paper-100/[0.04] px-3 py-2 text-sm text-paper-200">
          <input
            type="checkbox"
            checked={draft.requireConsent}
            onChange={(e) => setDraft({ ...draft, requireConsent: e.target.checked })}
          />
          Require consent before submit
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Consent text">
            <input
              className="input"
              value={draft.consentText}
              onChange={(e) => setDraft({ ...draft, consentText: e.target.value })}
            />
          </Field>
          <Field label="Privacy policy URL">
            <input
              className="input"
              value={draft.privacyPolicyUrl ?? ''}
              placeholder="https://acme.com/privacy"
              onChange={(e) =>
                setDraft({
                  ...draft,
                  privacyPolicyUrl: e.target.value || null,
                })
              }
            />
          </Field>
        </div>
      </section>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Branding" />
        <div className="grid md:grid-cols-2 gap-4">
          <ColorPaletteField
            label="Brand color"
            value={draft.brandColor}
            onChange={(brandColor) => setDraft({ ...draft, brandColor })}
          />
          <ColorPaletteField
            label="Accent color"
            value={draft.accentColor}
            onChange={(accentColor) => setDraft({ ...draft, accentColor })}
          />
          <Field label="Position">
            <select
              className="select"
              value={draft.position}
              onChange={(e) => setDraft({ ...draft, position: e.target.value })}
            >
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {labelize(position)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Size">
            <select
              className="select"
              value={draft.size}
              onChange={(e) => setDraft({ ...draft, size: e.target.value })}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 border-t border-paper-100/10 pt-4 md:grid-cols-3">
          <ThemeColorField draft={draft} setDraft={setDraft} field="surfaceColor" label="Surface color" />
          <ThemeColorField draft={draft} setDraft={setDraft} field="textColor" label="Text color" />
          <ThemeField draft={draft} setDraft={setDraft} field="borderRadius" label="Border radius" />
          <ThemeField draft={draft} setDraft={setDraft} field="launcherLabel" label="Launcher label" />
          <ThemeField draft={draft} setDraft={setDraft} field="launcherIcon" label="Launcher icon" />
          <ThemeField draft={draft} setDraft={setDraft} field="fontFamily" label="Font family" />
          <div className="md:col-span-3">
            <ThemeTextarea draft={draft} setDraft={setDraft} field="customCss" label="Custom CSS" />
          </div>
          <Field label="Dark mode">
            <select
              className="select"
              value={themeValue(draft, 'darkMode')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: { ...defaultTheme(draft.theme), darkMode: e.target.value },
                })
              }
            >
              {DARK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {labelize(mode)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Shadow">
            <select
              className="select"
              value={themeValue(draft, 'shadow')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: { ...defaultTheme(draft.theme), shadow: e.target.value },
                })
              }
            >
              {SHADOWS.map((shadow) => (
                <option key={shadow} value={shadow}>
                  {labelize(shadow)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Success animation">
            <select
              className="select"
              value={themeValue(draft, 'successAnimation')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: {
                    ...defaultTheme(draft.theme),
                    successAnimation: e.target.value as typeof SUCCESS_ANIMATIONS[number],
                  },
                })
              }
            >
              {SUCCESS_ANIMATIONS.map((animation) => (
                <option key={animation} value={animation}>
                  {labelize(animation)}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-end gap-3 rounded-lg bg-paper-100/[0.04] px-3 py-2 text-sm text-paper-200">
            <input
              type="checkbox"
              checked={Boolean(themeValue(draft, 'poweredBy'))}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: { ...defaultTheme(draft.theme), poweredBy: e.target.checked },
                })
              }
            />
            Show powered by
          </label>
        </div>
      </section>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Copy and fields" />
        <Field label="Title">
          <input
            className="input"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            className="textarea min-h-20"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </Field>
        <Field label="Success message">
          <input
            className="input"
            value={draft.successMessage}
            onChange={(e) => setDraft({ ...draft, successMessage: e.target.value })}
          />
        </Field>
        <div className="grid md:grid-cols-3 gap-4">
          <CsvField
            label="Enabled user fields"
            value={draft.enabledUserFields}
            onChange={(value) => setDraft({ ...draft, enabledUserFields: value })}
          />
          <CsvField
            label="Required user fields"
            value={draft.requiredUserFields}
            onChange={(value) => setDraft({ ...draft, requiredUserFields: value })}
          />
          <CsvField
            label="Metadata keys"
            value={draft.enabledMetadataKeys}
            onChange={(value) => setDraft({ ...draft, enabledMetadataKeys: value })}
          />
        </div>
      </section>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Submission types and survey" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-sm font-medium text-paper-200">
              Enabled types
            </span>
            <div className="grid grid-cols-2 gap-2">
              {SUBMISSION_TYPES.map((type) => {
                const enabled = draft.enabledTypes.includes(type);
                return (
                  <label
                    key={type}
                    className="flex items-center gap-2 rounded-lg bg-paper-100/[0.04] px-3 py-2 text-sm text-paper-200"
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...draft.enabledTypes, type]
                          : draft.enabledTypes.filter((item) => item !== type);
                        setDraft({
                          ...draft,
                          enabledTypes: next.length > 0 ? next : [type],
                        });
                      }}
                    />
                    {labelize(type)}
                  </label>
                );
              })}
            </div>
          </div>
          <Field label="Survey mode">
            <select
              className="select"
              value={draft.surveyMode}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  surveyMode: e.target.value as WidgetDto['surveyMode'],
                })
              }
            >
              <option value="none">None</option>
              <option value="csat">CSAT</option>
              <option value="nps">NPS</option>
              <option value="thumbs">Thumbs</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Targeting and triggers" />
        <div className="grid md:grid-cols-3 gap-4">
          <JsonField
            label="Page rules"
            value={draft.pageRules}
            placeholder='{"include":[{"kind":"urlPath","op":"startsWith","value":"/docs"}],"exclude":[]}'
            onChange={(value) => setDraft({ ...draft, pageRules: value })}
          />
          <JsonField
            label="Audience rules"
            value={draft.audienceRules}
            placeholder='{"all":[{"field":"metadata.plan","op":"in","value":["pro","enterprise"]}]}'
            onChange={(value) => setDraft({ ...draft, audienceRules: value })}
          />
          <JsonField
            label="Trigger config"
            value={draft.triggerConfig}
            placeholder='{"mode":"time_on_page","seconds":15}'
            onChange={(value) => setDraft({ ...draft, triggerConfig: value })}
          />
        </div>
        <label className="flex items-center gap-3 rounded-lg bg-paper-100/[0.04] px-3 py-2 text-sm text-paper-200">
          <input
            type="checkbox"
            checked={draft.inlineEnabled ?? true}
            onChange={(e) => setDraft({ ...draft, inlineEnabled: e.target.checked })}
          />
          Allow inline embeds
        </label>
      </section>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle title="A/B variants" />
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() =>
              setDraft({
                ...draft,
                variants: [...(draft.variants ?? []), newVariant(draft.id)],
              })
            }
          >
            Add variant
          </button>
        </div>
        <div className="space-y-3">
          {(draft.variants ?? []).map((variant, index) => (
            <div
              key={variant.id}
              className="grid gap-3 rounded-xl border border-paper-100/10 bg-paper-100/[0.025] p-4 md:grid-cols-[1fr_100px_1fr_1fr_auto]"
            >
              <Field label="Name">
                <input
                  className="input"
                  value={variant.name}
                  onChange={(e) =>
                    updateVariant(draft, setDraft, index, { name: e.target.value })
                  }
                />
              </Field>
              <Field label="Weight">
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={variant.weight}
                  onChange={(e) =>
                    updateVariant(draft, setDraft, index, {
                      weight: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <ColorPaletteField
                label="Brand color"
                value={variant.brandColor ?? draft.brandColor}
                onChange={(brandColor) =>
                  updateVariant(draft, setDraft, index, { brandColor })
                }
              />
              <Field label="Launcher label">
                <input
                  className="input"
                  value={variant.launcherLabel ?? ''}
                  onChange={(e) =>
                    updateVariant(draft, setDraft, index, {
                      launcherLabel: e.target.value || null,
                    })
                  }
                />
              </Field>
              <div className="flex items-end gap-2">
                <label className="flex h-10 items-center gap-2 rounded-lg bg-paper-100/[0.04] px-3 text-sm text-paper-200">
                  <input
                    type="checkbox"
                    checked={variant.enabled}
                    onChange={(e) =>
                      updateVariant(draft, setDraft, index, {
                        enabled: e.target.checked,
                      })
                    }
                  />
                  On
                </label>
                <button
                  type="button"
                  className="btn-secondary btn-sm h-10"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      variants: (draft.variants ?? []).filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle title="Form fields" />
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() =>
              setDraft({
                ...draft,
                fields: [
                  ...(draft.fields ?? []),
                  newField(draft.id, (draft.fields ?? []).length),
                ],
              })
            }
          >
            Add field
          </button>
        </div>
        <div className="space-y-3">
          {(draft.fields ?? []).map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-paper-100/10 bg-paper-100/[0.025] p-4 space-y-3"
            >
              <div className="grid md:grid-cols-4 gap-3">
                <Field label="Label">
                  <input
                    className="input"
                    value={field.label}
                    onChange={(e) =>
                      updateField(draft, setDraft, index, {
                        label: e.target.value,
                        key: slug(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Key">
                  <input
                    className="input font-mono"
                    value={field.key}
                    onChange={(e) =>
                      updateField(draft, setDraft, index, { key: slug(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Kind">
                  <select
                    className="select"
                    value={field.kind}
                    onChange={(e) =>
                      updateField(draft, setDraft, index, {
                        kind: e.target.value as typeof FIELD_KINDS[number],
                      })
                    }
                  >
                    {FIELD_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {labelize(kind)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Target">
                  <select
                    className="select"
                    value={field.target}
                    onChange={(e) =>
                      updateField(draft, setDraft, index, {
                        target: e.target.value as typeof FIELD_TARGETS[number],
                      })
                    }
                  >
                    {FIELD_TARGETS.map((target) => (
                      <option key={target} value={target}>
                        {labelize(target)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <Field label="Placeholder">
                  <input
                    className="input"
                    value={field.placeholder ?? ''}
                    onChange={(e) =>
                      updateField(draft, setDraft, index, {
                        placeholder: e.target.value || null,
                      })
                    }
                  />
                </Field>
                <Field label="Options">
                  <input
                    className="input"
                    value={optionsCsv(field.options)}
                    placeholder="bug, idea, question"
                    onChange={(e) =>
                      updateField(draft, setDraft, index, {
                        options: fromCsv(e.target.value),
                      })
                    }
                  />
                </Field>
                <label className="flex h-10 items-center gap-2 rounded-lg bg-paper-100/[0.04] px-3 text-sm text-paper-200">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateField(draft, setDraft, index, {
                        required: e.target.checked,
                      })
                    }
                  />
                  Required
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={index === 0}
                  onClick={() => moveField(draft, setDraft, index, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={index === (draft.fields ?? []).length - 1}
                  onClick={() => moveField(draft, setDraft, index, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      fields: (draft.fields ?? []).filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface rounded-2xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Image attachments" />
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Max images per submit">
            <input
              className="input"
              type="number"
              min={0}
              max={10}
              value={draft.maxAttachmentsPerSubmit}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  maxAttachmentsPerSubmit: Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Max image size (MB)">
            <input
              className="input"
              type="number"
              min={1}
              max={50}
              value={Math.round(draft.maxAttachmentBytes / 1024 / 1024)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  maxAttachmentBytes: Number(e.target.value) * 1024 * 1024,
                })
              }
            />
          </Field>
          <CsvField
            label="Allowed image MIME types"
            value={draft.allowedMimeTypes}
            onChange={(value) => setDraft({ ...draft, allowedMimeTypes: value })}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Saving' : 'Save widget'}
        </button>
        {saveMutation.isError && (
          <span className="text-sm text-[#FF9999]">{String(saveMutation.error)}</span>
        )}
        {saveMutation.isSuccess && <span className="text-sm text-lime">Saved</span>}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-mono uppercase tracking-wider text-paper-400">
      {title}
    </h2>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-paper-200">{label}</span>
      {children}
    </label>
  );
}

function CsvField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Field label={label}>
      <input
        className="input"
        value={csv(value)}
        onChange={(e) => onChange(fromCsv(e.target.value))}
      />
    </Field>
  );
}

function ThemeField({
  draft,
  setDraft,
  field,
  label,
}: {
  draft: WidgetDto;
  setDraft: (value: WidgetDto) => void;
  field:
    | 'surfaceColor'
    | 'textColor'
    | 'borderRadius'
    | 'launcherLabel'
    | 'launcherIcon'
    | 'fontFamily';
  label: string;
}) {
  return (
    <Field label={label}>
      <input
        className="input"
        value={String(themeValue(draft, field) ?? '')}
        onChange={(e) =>
          setDraft({
            ...draft,
            theme: { ...defaultTheme(draft.theme), [field]: e.target.value },
          })
        }
      />
    </Field>
  );
}

function ThemeColorField({
  draft,
  setDraft,
  field,
  label,
}: {
  draft: WidgetDto;
  setDraft: (value: WidgetDto) => void;
  field: 'surfaceColor' | 'textColor';
  label: string;
}) {
  return (
    <ColorPaletteField
      label={label}
      value={String(themeValue(draft, field) ?? '')}
      onChange={(value) =>
        setDraft({
          ...draft,
          theme: { ...defaultTheme(draft.theme), [field]: value },
        })
      }
    />
  );
}

function ThemeTextarea({
  draft,
  setDraft,
  field,
  label,
}: {
  draft: WidgetDto;
  setDraft: (value: WidgetDto) => void;
  field: 'customCss';
  label: string;
}) {
  return (
    <Field label={label}>
      <textarea
        className="textarea min-h-28 font-mono !text-xs"
        value={String(themeValue(draft, field) ?? '')}
        placeholder=".widget-theme .btn-primary { border-radius: 14px; }"
        onChange={(e) =>
          setDraft({
            ...draft,
            theme: {
              ...defaultTheme(draft.theme),
              [field]: e.target.value || null,
            },
          })
        }
      />
    </Field>
  );
}

function JsonField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: unknown;
  placeholder: string;
  onChange: (value: unknown) => void;
}) {
  const [text, setText] = useState(() =>
    value ? JSON.stringify(value, null, 2) : '',
  );
  const [error, setError] = useState('');

  useEffect(() => {
    setText(value ? JSON.stringify(value, null, 2) : '');
  }, [value]);

  return (
    <Field label={label}>
      <textarea
        className="textarea min-h-32 font-mono !text-xs"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (!next.trim()) {
            setError('');
            onChange(null);
            return;
          }
          try {
            onChange(JSON.parse(next));
            setError('');
          } catch {
            setError('Invalid JSON');
          }
        }}
      />
      {error && <span className="text-xs text-[#FF9999]">{error}</span>}
    </Field>
  );
}

function defaultTheme(theme: WidgetDto['theme']): WidgetThemeDraft {
  const value = theme as Partial<WidgetThemeDraft> | null | undefined;
  return {
    logoUrl: value?.logoUrl ?? null,
    surfaceColor: value?.surfaceColor ?? '#11100E',
    textColor: value?.textColor ?? '#F5EFE5',
    fontFamily: value?.fontFamily ?? 'system',
    borderRadius: value?.borderRadius ?? '18px',
    shadow: value?.shadow ?? 'soft',
    launcherIcon: value?.launcherIcon ?? 'message-circle',
    launcherLabel: value?.launcherLabel ?? 'Feedback',
    darkMode: value?.darkMode ?? 'auto',
    poweredBy: value?.poweredBy ?? true,
    successAnimation: value?.successAnimation ?? 'check',
    customCss: value?.customCss ?? null,
  };
}

function themeValue<T extends keyof ReturnType<typeof defaultTheme>>(
  draft: WidgetDto,
  key: T,
) {
  return defaultTheme(draft.theme)[key];
}

function themePayload(draft: WidgetDto) {
  return defaultTheme(draft.theme);
}

function newField(widgetId: string, index: number): NonNullable<WidgetDto['fields']>[number] {
  const createdAt = new Date().toISOString();
  return {
    id: `new-${createdAt}-${index}`,
    widgetId,
    key: `field_${index + 1}`,
    label: `Field ${index + 1}`,
    kind: 'text',
    required: false,
    placeholder: null,
    helpText: null,
    validation: null,
    options: null,
    visibleWhen: null,
    target: 'metadata',
    order: index * 10,
    createdAt,
    updatedAt: createdAt,
  };
}

function newVariant(widgetId: string): NonNullable<WidgetDto['variants']>[number] {
  const createdAt = new Date().toISOString();
  return {
    id: `new-variant-${createdAt}`,
    widgetId,
    name: 'Variant',
    weight: 50,
    brandColor: null,
    launcherLabel: null,
    enabled: true,
    createdAt,
    updatedAt: createdAt,
  };
}

function updateField(
  draft: WidgetDto,
  setDraft: (value: WidgetDto) => void,
  index: number,
  patch: Partial<NonNullable<WidgetDto['fields']>[number]>,
) {
  const fields = [...(draft.fields ?? [])];
  fields[index] = { ...fields[index], ...patch };
  setDraft({ ...draft, fields });
}

function moveField(
  draft: WidgetDto,
  setDraft: (value: WidgetDto) => void,
  index: number,
  direction: -1 | 1,
) {
  const fields = [...(draft.fields ?? [])];
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= fields.length) return;
  [fields[index], fields[nextIndex]] = [fields[nextIndex], fields[index]];
  setDraft({ ...draft, fields });
}

function updateVariant(
  draft: WidgetDto,
  setDraft: (value: WidgetDto) => void,
  index: number,
  patch: Partial<NonNullable<WidgetDto['variants']>[number]>,
) {
  const variants = [...(draft.variants ?? [])];
  variants[index] = { ...variants[index], ...patch };
  setDraft({ ...draft, variants });
}

function optionsCsv(options: unknown) {
  return Array.isArray(options)
    ? options
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            return String(record.value ?? record.label ?? '');
          }
          return '';
        })
        .filter(Boolean)
        .join(', ')
    : '';
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function labelize(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}
