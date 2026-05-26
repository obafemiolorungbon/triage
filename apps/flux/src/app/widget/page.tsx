'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { getPublicApiBase } from '../../lib/api-base';

type SubmissionType = 'bug' | 'idea' | 'question' | 'praise' | 'custom';
type SurveyMode = 'none' | 'csat' | 'nps' | 'thumbs';
type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'url'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'rating'
  | 'file';
type FieldTarget = 'user' | 'metadata' | 'message' | 'title' | 'category' | 'severity';
type ThemeMode = 'auto' | 'light' | 'dark';
type SuccessAnimation = 'none' | 'check' | 'thumbs-up';

type WidgetTheme = {
  logoUrl?: string | null;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  shadow: string;
  launcherIcon: string;
  launcherLabel: string;
  darkMode: ThemeMode;
  poweredBy: boolean;
  successAnimation: SuccessAnimation;
  customCss?: string | null;
};

type WidgetField = {
  id?: string;
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown;
  target: FieldTarget;
  order: number;
};

type WidgetConfig = {
  widgetKey: string;
  brandColor: string;
  accentColor: string;
  title: string;
  description: string;
  successMessage: string;
  enabledUserFields: string[];
  requiredUserFields: string[];
  enabledMetadataKeys: string[];
  maxAttachmentBytes: number;
  allowedMimeTypes: string[];
  maxAttachmentsPerSubmit: number;
  enabledTypes: SubmissionType[];
  surveyMode: SurveyMode;
  fields: WidgetField[];
  requireConsent: boolean;
  privacyPolicyUrl?: string | null;
  consentText: string;
  theme?: WidgetTheme | null;
};

type UploadedAttachment = {
  storageKey: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
};

type KbSuggestion = {
  chunkId: string;
  articleId: string;
  slug: string;
  title: string;
  heading: string | null;
  body: string;
  score: number;
};

type ContextPayload = {
  user?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  userHash?: string;
  prefill?: Record<string, unknown>;
  source?: { url?: string; title?: string };
};

type DraftPayload = {
  title: string;
  message: string;
  user: Record<string, string>;
  metadata: Record<string, string>;
  fields: Record<string, FieldValue>;
};

type FieldValue = string | number | boolean | string[];

const DEFAULT_FIELDS: WidgetField[] = [
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

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen grid place-items-center bg-ink-900 text-paper-100">
          <span className="spinner" />
        </main>
      }
    >
      <WidgetPageInner />
    </Suspense>
  );
}

function WidgetPageInner() {
  const sp = useSearchParams();
  const widgetKey = sp.get('widgetKey') ?? '';
  const hostOrigin = sp.get('hostOrigin') ?? '';
  const api = getPublicApiBase();
  const [submissionType, setSubmissionType] = useState<SubmissionType>('bug');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [user, setUser] = useState<Record<string, string>>({});
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [userHash, setUserHash] = useState('');
  const [website, setWebsite] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [copiedShortId, setCopiedShortId] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [source, setSource] = useState<ContextPayload['source']>({});
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadedDraftKey, setLoadedDraftKey] = useState('');
  const [surveyScore, setSurveyScore] = useState<number | null>(null);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveyDone, setSurveyDone] = useState(false);
  const [kbSuggestions, setKbSuggestions] = useState<KbSuggestion[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbAnswer, setKbAnswer] = useState('');
  const [kbAnswerLoading, setKbAnswerLoading] = useState(false);
  const [kbDismissed, setKbDismissed] = useState(false);
  const [prefersDark, setPrefersDark] = useState(true);

  const configQuery = useQuery({
    queryKey: ['widget-config', widgetKey, hostOrigin],
    enabled: Boolean(widgetKey),
    queryFn: async () => {
      const res = await fetch(`${api}/api/v1/widget/config/${widgetKey}`, {
        headers: hostOrigin ? { 'X-Triage-Host-Origin': hostOrigin } : undefined,
      });
      if (!res.ok) throw new Error('Widget is not configured');
      return (await res.json()) as WidgetConfig;
    },
  });

  const config = configQuery.data;
  const typeOptions: SubmissionType[] = config?.enabledTypes?.length
    ? config.enabledTypes
    : ['bug'];
  const draftKey = config ? `triage-widget-draft:${widgetKey}:${submissionType}` : '';
  const userFields = config?.enabledUserFields ?? ['email', 'name'];
  const metadataKeys = config?.enabledMetadataKeys ?? [];
  const required = useMemo(
    () => new Set(config?.requiredUserFields ?? ['email']),
    [config?.requiredUserFields],
  );
  const formFields = useMemo(
    () =>
      (config?.fields?.length ? config.fields : DEFAULT_FIELDS)
        .slice()
        .sort((a, b) => a.order - b.order),
    [config?.fields],
  );
  const deflectionText = String(fieldValues.message ?? message).trim();
  const themeStyle = useMemo(
    () => (config ? widgetThemeStyle(config, prefersDark) : undefined),
    [config, prefersDark],
  );
  const theme = useMemo(
    () => (config ? effectiveWidgetTheme(config, prefersDark) : null),
    [config, prefersDark],
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDark(media.matches);
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (config && !typeOptions.includes(submissionType)) {
      setSubmissionType(typeOptions[0]);
    }
  }, [config, submissionType, typeOptions]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== 'triage:context') return;
      const payload = event.data.payload as ContextPayload;
      setUser((prev) => ({ ...prev, ...stringifyRecord(payload.user) }));
      setMetadata((prev) => ({ ...prev, ...stringifyRecord(payload.metadata) }));
      setUserHash(typeof payload.userHash === 'string' ? payload.userHash : '');
      if (payload.prefill) applyPrefill(payload.prefill);
      setSource(payload.source ?? {});
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (event.key === 'Escape') {
        window.parent.postMessage({ type: 'triage:close' }, '*');
      }
      if (event.key === '?' && !typing) {
        event.preventDefault();
        setShowShortcutHelp((next) => !next);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!draftKey) return;
    const raw = window.localStorage.getItem(draftKey);
    if (raw) {
      try {
        const draft = JSON.parse(raw) as DraftPayload;
        setTitle(draft.title ?? '');
        setMessage(draft.message ?? '');
        setUser(draft.user ?? {});
        setMetadata(draft.metadata ?? {});
        setFieldValues(draft.fields ?? {});
      } catch {
        window.localStorage.removeItem(draftKey);
      }
    } else {
      setTitle('');
      setMessage('');
      setFieldValues({});
    }
    setLoadedDraftKey(draftKey);
  }, [draftKey]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const routedTitle = String(fieldValues.title ?? title).trim();
      const routedMessage = String(fieldValues.message ?? message).trim();
      const res = await fetch(`${api}/api/v1/widget/feedback`, {
        method: 'POST',
        headers: widgetHeaders(hostOrigin),
        body: JSON.stringify({
          widgetKey,
          type: submissionType,
          title: routedTitle || undefined,
          message: routedMessage || undefined,
          fields: fieldValues,
          user,
          metadata,
          userHash: userHash || undefined,
          website,
          consentAccepted,
          source,
          attachments,
        }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, 'Could not send feedback'));
      return (await res.json()) as { id: string; shortId: string; status: string };
    },
    onSuccess: () => {
      if (draftKey) window.localStorage.removeItem(draftKey);
      setAttachments([]);
      setCopiedShortId(false);
      if (deflectionText) {
        void postKbEvent(api, {
          widgetKey,
          query: deflectionText,
          outcome: 'submitted',
          articleId: kbSuggestions[0]?.articleId,
          score: kbSuggestions[0]?.score,
        });
      }
    },
  });

  const surveyMutation = useMutation({
    mutationFn: async () => {
      if (!surveyScore || !submitMutation.data?.id || !config) return null;
      const res = await fetch(`${api}/api/v1/widget/survey`, {
        method: 'POST',
        headers: widgetHeaders(hostOrigin),
        body: JSON.stringify({
          widgetKey,
          feedbackId: submitMutation.data.id,
          survey: {
            score: surveyScore,
            scale: surveyScale(config.surveyMode),
            comment: surveyComment || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, 'Could not save rating'));
      return res.json();
    },
    onSuccess: () => setSurveyDone(true),
  });

  useEffect(() => {
    if (!draftKey || loadedDraftKey !== draftKey || submitMutation.isSuccess) return;
    const payload: DraftPayload = { title, message, user, metadata, fields: fieldValues };
    window.localStorage.setItem(draftKey, JSON.stringify(payload));
  }, [
    draftKey,
    fieldValues,
    loadedDraftKey,
    message,
    metadata,
    submitMutation.isSuccess,
    title,
    user,
  ]);

  useEffect(() => {
    if (!config || kbDismissed || deflectionText.length < 12) {
      setKbSuggestions([]);
      setKbAnswer('');
      return;
    }
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setKbLoading(true);
      try {
        const res = await fetch(`${api}/api/v1/widget/kb/search`, {
          method: 'POST',
          headers: widgetHeaders(hostOrigin),
          signal: controller.signal,
          body: JSON.stringify({
            widgetKey,
            query: deflectionText,
            metadata: { source: 'widget_form' },
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { items: KbSuggestion[] };
          setKbSuggestions(json.items);
        }
      } catch {
        if (!controller.signal.aborted) setKbSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setKbLoading(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [api, config, deflectionText, kbDismissed, widgetKey]);

  async function askKnowledgeBase() {
    if (!deflectionText) return;
    setKbAnswerLoading(true);
    try {
      const res = await fetch(`${api}/api/v1/widget/kb/answer`, {
        method: 'POST',
        headers: widgetHeaders(hostOrigin),
        body: JSON.stringify({
          widgetKey,
          query: deflectionText,
          metadata: { source: 'widget_form' },
        }),
      });
      if (!res.ok) throw new Error('Could not ask AI');
      const json = (await res.json()) as {
        answer: string;
        citations: KbSuggestion[];
      };
      setKbAnswer(json.answer);
      setKbSuggestions(json.citations);
    } catch {
      setKbAnswer('I could not check the knowledge base right now.');
    } finally {
      setKbAnswerLoading(false);
    }
  }

  function markSolved(articleId?: string, score?: number) {
    void postKbEvent(api, {
      widgetKey,
      query: deflectionText || 'Solved from knowledge base',
      outcome: 'solved',
      articleId,
      score,
    });
    setKbDismissed(true);
    window.parent.postMessage({ type: 'triage:close' }, '*');
  }

  async function uploadImages(files: FileList | null) {
    if (!files || !config) return;
    setUploadError(null);
    const selected = Array.from(files);
    if (selected.length === 0) return;
    if (attachments.length + selected.length > config.maxAttachmentsPerSubmit) {
      setUploadError(`Attach up to ${config.maxAttachmentsPerSubmit} images.`);
      return;
    }
    setUploading(true);
    try {
      for (const file of selected) {
        if (!file.type.startsWith('image/')) throw new Error('Only image files are supported.');
        if (!config.allowedMimeTypes.includes(file.type)) {
          throw new Error(`${file.name} is not an allowed image type.`);
        }
        if (file.size > config.maxAttachmentBytes) {
          throw new Error(
            `${file.name} must be ${formatBytes(config.maxAttachmentBytes)} or smaller.`,
          );
        }
        const uploadRes = await fetch(`${api}/api/v1/widget/upload-url`, {
          method: 'POST',
          headers: widgetHeaders(hostOrigin),
          body: JSON.stringify({
            widgetKey,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        });
        if (!uploadRes.ok) throw new Error(`Could not prepare upload for ${file.name}.`);
        const upload = (await uploadRes.json()) as {
          url: string;
          storageKey: string;
          headers: Record<string, string>;
        };
        const putRes = await fetch(upload.url, {
          method: 'PUT',
          headers: upload.headers,
          body: file,
        });
        if (!putRes.ok) throw new Error(`Could not upload ${file.name}.`);
        setAttachments((prev) => [
          ...prev,
          {
            storageKey: upload.storageKey,
            mimeType: file.type,
            fileName: file.name,
            sizeBytes: file.size,
          },
        ]);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  }

  function applyPrefill(prefill: Record<string, unknown>) {
    if (typeof prefill.type === 'string') {
      setSubmissionType(prefill.type as SubmissionType);
    }
    if (typeof prefill.title === 'string') setTitle(prefill.title);
    if (typeof prefill.message === 'string') setMessage(prefill.message);
    setFieldValues((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(prefill).filter(
          ([key]) => !['type', 'title', 'message'].includes(key),
        ).map(([key, value]) => [key, normalizeFieldValue(value)]),
      ),
    }));
  }

  if (configQuery.isLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-ink-900 text-paper-100">
        <span className="spinner" />
      </main>
    );
  }

  if (configQuery.isError || !config) {
    return (
      <main className="min-h-screen grid place-items-center bg-ink-900 text-paper-100 p-6">
        <p className="text-sm text-paper-400">Widget unavailable.</p>
      </main>
    );
  }

  if (submitMutation.isSuccess) {
    const askSurvey = config.surveyMode !== 'none' && !surveyDone;
    const shortId = submitMutation.data?.shortId;
    return (
      <main
        className="widget-theme min-h-screen bg-ink-900 text-paper-100 p-5 flex flex-col"
        role="dialog"
        aria-modal="true"
        style={themeStyle}
      >
        {theme?.customCss && <style>{theme.customCss}</style>}
        <button
          type="button"
          className="self-end btn-ghost"
          onClick={() => window.parent.postMessage({ type: 'triage:close' }, '*')}
        >
          Close
        </button>
        <div className="flex-1 grid place-items-center text-center">
          {askSurvey ? (
            <div className="w-full max-w-sm space-y-5">
          <h1 className="text-2xl font-semibold tracking-tight text-paper-50">How was the experience?</h1>
              <SurveyPicker
                mode={config.surveyMode}
                value={surveyScore}
                onChange={setSurveyScore}
              />
              <textarea
                className="textarea min-h-24"
                placeholder="Optional comment"
                value={surveyComment}
                onChange={(e) => setSurveyComment(e.target.value)}
              />
              {surveyMutation.isError && (
                <div className="rounded-lg px-3 py-2 text-sm text-[#FF9999] bg-[#ff5e5e14]">
                  {String(surveyMutation.error)}
                </div>
              )}
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSurveyDone(true)}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!surveyScore || surveyMutation.isPending}
                  style={{ background: config.brandColor, color: config.accentColor }}
                  onClick={() => surveyMutation.mutate()}
                >
                  {surveyMutation.isPending ? 'Saving' : 'Submit rating'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <SuccessAnimationMark
                animation={theme?.successAnimation ?? 'check'}
                brandColor={config.brandColor}
                accentColor={config.accentColor}
              />
              <h1 className="text-2xl font-semibold tracking-tight text-paper-50">{config.successMessage}</h1>
              {shortId && (
                <button
                  type="button"
                  className="mt-4 rounded-xl bg-paper-100/[0.06] px-3 py-2 font-mono text-sm text-paper-200 ring-1 ring-paper-100/10 hover:bg-paper-100/[0.09]"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(shortId);
                    setCopiedShortId(true);
                  }}
                >
                  {copiedShortId ? 'Copied ' : 'Copy reference '}
                  {shortId}
                </button>
              )}
              {theme?.poweredBy && (
                <p className="mt-4 text-xs text-paper-500">Powered by Triage</p>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      className="widget-theme min-h-screen bg-ink-900 p-4 text-paper-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="widget-title"
      aria-describedby="widget-description"
      style={themeStyle}
    >
      {theme?.customCss && <style>{theme.customCss}</style>}
      <form
        className="mx-auto flex max-w-md flex-col gap-4 rounded-[22px] border border-paper-100/[0.08] bg-paper-100/[0.025] p-4 shadow-[inset_0_1px_0_rgba(245,239,229,0.04)]"
        onSubmit={(e) => {
          e.preventDefault();
          setAttemptedSubmit(true);
          submitMutation.mutate();
        }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-paper-100/[0.075] pb-4">
          <div>
            {theme?.logoUrl && (
              <img
                src={theme.logoUrl}
                alt=""
                className="mb-3 h-8 max-w-40 object-contain"
              />
            )}
            <h1 id="widget-title" className="text-2xl font-semibold tracking-tight text-paper-50">{config.title}</h1>
            <p id="widget-description" className="mt-1 text-sm text-paper-400">{config.description}</p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => window.parent.postMessage({ type: 'triage:close' }, '*')}
          >
            Close
          </button>
        </header>

        {typeOptions.length > 1 && (
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {typeOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`rounded-xl px-3 py-2 text-sm capitalize ring-1 transition-colors ${
                    submissionType === type
                      ? 'bg-paper-100 text-ink-950 ring-paper-100'
                      : 'bg-paper-100/[0.04] text-paper-300 ring-paper-100/10'
                  }`}
                  onClick={() => setSubmissionType(type)}
                >
                  {labelize(type)}
                </button>
              ))}
            </div>
          </Field>
        )}

        {formFields.map((field) => (
          <Field key={field.key} label={field.label} helpText={field.helpText}>
            <FieldControl
              field={field}
              value={fieldValues[field.key]}
              invalid={attemptedSubmit && field.required && isEmptyFieldValue(fieldValues[field.key])}
              onChange={(value) =>
                setFieldValues((prev) => ({ ...prev, [field.key]: value }))
              }
            />
          </Field>
        ))}

        {!kbDismissed && (kbLoading || kbSuggestions.length > 0 || kbAnswer) && (
          <section className="rounded-xl bg-paper-100/[0.04] p-3 ring-1 ring-paper-100/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-paper-100">Suggested help</h2>
                <p className="text-xs text-paper-500">
                  Check these before sending a ticket.
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-paper-500 hover:text-paper-100"
                onClick={() => setKbDismissed(true)}
              >
                Hide
              </button>
            </div>
            {kbLoading && <p className="mt-3 text-xs text-paper-500">Searching...</p>}
            {kbSuggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                {kbSuggestions.map((item) => (
                  <article
                    key={item.chunkId}
                    className="rounded-lg bg-ink-950/50 p-3 text-sm"
                  >
                    <h3 className="text-paper-100">{item.title}</h3>
                    {item.heading && (
                      <p className="mt-0.5 text-xs text-paper-500">{item.heading}</p>
                    )}
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-paper-400">
                      {item.body}
                    </p>
                    <button
                      type="button"
                      className="mt-3 text-xs font-medium text-paper-100 hover:text-paper-300"
                      onClick={() => markSolved(item.articleId, item.score)}
                    >
                      This solved it
                    </button>
                  </article>
                ))}
              </div>
            )}
            {kbAnswer && (
              <div className="mt-3 whitespace-pre-wrap rounded-lg bg-ink-950/70 p-3 text-sm leading-6 text-paper-200">
                {kbAnswer}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={kbAnswerLoading}
                onClick={askKnowledgeBase}
              >
                {kbAnswerLoading ? 'Asking' : 'Ask AI'}
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setKbDismissed(true)}
              >
                Submit anyway
              </button>
            </div>
          </section>
        )}

        {userFields.map((field) => (
          <Field key={field} label={labelize(field)}>
            <input
              className="input"
              required={required.has(field)}
              aria-invalid={attemptedSubmit && required.has(field) && !user[field] ? true : undefined}
              type={field === 'email' ? 'email' : 'text'}
              value={user[field] ?? ''}
              onChange={(e) => setUser({ ...user, [field]: e.target.value })}
            />
          </Field>
        ))}

        {metadataKeys.map((key) => (
          <Field key={key} label={labelize(key)}>
            <input
              className="input"
              value={metadata[key] ?? ''}
              onChange={(e) => setMetadata({ ...metadata, [key]: e.target.value })}
            />
          </Field>
        ))}

        {config.maxAttachmentsPerSubmit > 0 && (
          <Field label="Images">
            <div className="space-y-3">
              <input
                className="input file:mr-3 file:rounded-md file:border-0 file:bg-paper-100/10 file:px-3 file:py-1.5 file:text-paper-100"
                type="file"
                accept={config.allowedMimeTypes.join(',')}
                multiple
                disabled={uploading}
                onChange={(e) => {
                  void uploadImages(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
              <p className="text-xs text-paper-500">
                {config.maxAttachmentsPerSubmit} images max,{' '}
                {formatBytes(config.maxAttachmentBytes)} each.
              </p>
              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((attachment) => (
                    <li
                      key={attachment.storageKey}
                      className="flex items-center justify-between gap-3 rounded-lg bg-paper-100/[0.04] px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-paper-200">
                        {attachment.fileName}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-paper-500 hover:text-paper-100"
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.filter((item) => item.storageKey !== attachment.storageKey),
                          )
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {uploading && <p className="text-xs text-paper-400">Uploading image...</p>}
              {uploadError && (
                <div className="rounded-lg px-3 py-2 text-sm text-[#FF9999] bg-[#ff5e5e14]">
                  {uploadError}
                </div>
              )}
            </div>
          </Field>
        )}

        {config.requireConsent && (
          <label className="flex items-start gap-3 rounded-xl bg-paper-100/[0.04] p-3 text-sm text-paper-300 ring-1 ring-paper-100/10">
            <input
              type="checkbox"
              className="mt-1"
              required
              aria-invalid={attemptedSubmit && !consentAccepted ? true : undefined}
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
            />
            <span>
              {config.consentText}{' '}
              {config.privacyPolicyUrl && (
                <a
                  className="text-paper-100 underline decoration-paper-100/30 underline-offset-4"
                  href={config.privacyPolicyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy policy
                </a>
              )}
            </span>
          </label>
        )}

        {submitMutation.isError && (
          <div className="rounded-lg px-3 py-2 text-sm text-[#FF9999] bg-[#ff5e5e14]">
            {String(submitMutation.error)}
          </div>
        )}

        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="sr-only"
          aria-hidden="true"
        />

        <button
          type="submit"
          className="btn-primary h-11 justify-center"
          disabled={submitMutation.isPending || uploading || (config.requireConsent && !consentAccepted)}
          style={{ background: config.brandColor, color: config.accentColor }}
        >
          {uploading ? 'Uploading' : submitMutation.isPending ? 'Sending' : 'Send feedback'}
        </button>
        {theme?.poweredBy && (
          <p className="text-center text-xs text-paper-500">Powered by Triage</p>
        )}
        {showShortcutHelp && (
          <div className="rounded-xl bg-paper-100/[0.04] p-3 text-xs leading-5 text-paper-400 ring-1 ring-paper-100/10">
            <p className="font-medium text-paper-200">Keyboard shortcuts</p>
            <p>Escape closes the widget. ? toggles this help.</p>
          </div>
        )}
      </form>
    </main>
  );
}

function Field({
  label,
  helpText,
  children,
}: {
  label: string;
  helpText?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-paper-200">{label}</span>
      {children}
      {helpText && <span className="text-xs text-paper-500">{helpText}</span>}
    </label>
  );
}

function FieldControl({
  field,
  value,
  invalid,
  onChange,
}: {
  field: WidgetField;
  value: FieldValue | undefined;
  invalid?: boolean;
  onChange: (value: FieldValue) => void;
}) {
  const options = fieldOptions(field);
  if (field.target === 'severity') {
    return (
      <select
        className="select"
        required={field.required}
        aria-invalid={invalid || undefined}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select severity</option>
        {['low', 'medium', 'high', 'critical'].map((option) => (
          <option key={option} value={option}>
            {labelize(option)}
          </option>
        ))}
      </select>
    );
  }
  if (field.kind === 'textarea') {
    return (
      <textarea
        className="textarea min-h-32"
        required={field.required}
        aria-invalid={invalid || undefined}
        placeholder={field.placeholder ?? undefined}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.kind === 'select' || field.kind === 'radio') {
    return (
      <select
        className="select"
        required={field.required}
        aria-invalid={invalid || undefined}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.kind === 'multiselect') {
    const current = Array.isArray(value) ? value : [];
    return (
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 rounded-lg bg-paper-100/[0.04] px-3 py-2 text-sm text-paper-200"
          >
            <input
              type="checkbox"
              checked={current.includes(option.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...current, option.value]
                    : current.filter((item) => item !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }
  if (field.kind === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }
  if (field.kind === 'rating') {
    return (
      <input
        className="input"
        type="number"
        min={1}
        max={10}
        required={field.required}
        aria-invalid={invalid || undefined}
        value={String(value ?? '')}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  return (
    <input
      className="input"
      required={field.required}
      aria-invalid={invalid || undefined}
      type={field.kind === 'number' ? 'number' : field.kind}
      placeholder={field.placeholder ?? undefined}
      value={String(value ?? '')}
      onChange={(e) =>
        onChange(field.kind === 'number' ? Number(e.target.value) : e.target.value)
      }
    />
  );
}

function SurveyPicker({
  mode,
  value,
  onChange,
}: {
  mode: SurveyMode;
  value: number | null;
  onChange: (value: number) => void;
}) {
  if (mode === 'thumbs') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Not good', value: 0 },
          { label: 'Good', value: 1 },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            className={`rounded-lg px-3 py-3 text-sm ring-1 ${
              value === item.value
                ? 'bg-paper-100 text-ink-950 ring-paper-100'
                : 'bg-paper-100/[0.04] text-paper-300 ring-paper-100/10'
            }`}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }
  const max = mode === 'nps' ? 10 : 5;
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: max }, (_, index) => index + 1).map((score) => (
        <button
          key={score}
          type="button"
          className={`aspect-square rounded-lg text-sm ring-1 ${
            value === score
              ? 'bg-paper-100 text-ink-950 ring-paper-100'
              : 'bg-paper-100/[0.04] text-paper-300 ring-paper-100/10'
          }`}
          onClick={() => onChange(score)}
        >
          {score}
        </button>
      ))}
    </div>
  );
}

function SuccessAnimationMark({
  animation,
  brandColor,
  accentColor,
}: {
  animation: SuccessAnimation;
  brandColor: string;
  accentColor: string;
}) {
  if (animation === 'none') return null;
  const thumbs = animation === 'thumbs-up';
  return (
    <div
      className="success-mark mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full"
      style={{ background: brandColor, color: accentColor }}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="h-9 w-9"
      >
        {thumbs ? (
          <>
            <path
              className="success-draw"
              d="M25 29v22M25 31l8-15c1.8-3.5 7-2.2 7 1.7V27h9.7c3.7 0 6.2 3.8 4.8 7.2l-4.4 10.9A9.5 9.5 0 0141.3 51H23"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="success-draw success-draw-delay"
              d="M11 30h8v21h-8z"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <path
            className="success-draw"
            d="M18 33.5l9.2 9.2L47 22.8"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

function surveyScale(mode: SurveyMode) {
  if (mode === 'nps') return 'nps_10';
  if (mode === 'thumbs') return 'thumbs';
  return 'csat_5';
}

function fieldOptions(field: WidgetField) {
  const raw = field.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return { value: item, label: item };
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const value = String(record.value ?? record.label ?? '');
        const label = String(record.label ?? record.value ?? value);
        return value ? { value, label } : null;
      }
      return null;
    })
    .filter((item): item is { value: string; label: string } => Boolean(item));
}

function labelize(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function stringifyRecord(value: Record<string, unknown> | undefined) {
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value ?? {})) {
    if (item === undefined || item === null) continue;
    out[key] = String(item);
  }
  return out;
}

function normalizeFieldValue(value: unknown): FieldValue {
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(String);
  return String(value ?? '');
}

function isEmptyFieldValue(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`;
}

const DEFAULT_DARK_THEME: WidgetTheme = {
  logoUrl: null,
  surfaceColor: '#11100E',
  textColor: '#F5EFE5',
  fontFamily: 'system',
  borderRadius: '18px',
  shadow: 'soft',
  launcherIcon: 'message-circle',
  launcherLabel: 'Feedback',
  darkMode: 'auto',
  poweredBy: true,
  successAnimation: 'check',
  customCss: null,
};

const DEFAULT_LIGHT_THEME: WidgetTheme = {
  ...DEFAULT_DARK_THEME,
  surfaceColor: '#F5EEE2',
  textColor: '#17130E',
};

function effectiveWidgetTheme(config: WidgetConfig, prefersDark: boolean): WidgetTheme {
  const raw = { ...DEFAULT_DARK_THEME, ...(config.theme ?? {}) };
  const mode = raw.darkMode === 'auto' ? (prefersDark ? 'dark' : 'light') : raw.darkMode;
  const hasDefaultDarkColors =
    raw.surfaceColor.toLowerCase() === DEFAULT_DARK_THEME.surfaceColor.toLowerCase() &&
    raw.textColor.toLowerCase() === DEFAULT_DARK_THEME.textColor.toLowerCase();

  if (mode === 'light' && hasDefaultDarkColors) {
    return { ...raw, surfaceColor: DEFAULT_LIGHT_THEME.surfaceColor, textColor: DEFAULT_LIGHT_THEME.textColor };
  }
  return raw;
}

function widgetThemeStyle(
  config: WidgetConfig,
  prefersDark: boolean,
): CSSProperties & Record<string, string> {
  const theme = effectiveWidgetTheme(config, prefersDark);
  const light = relativeLuminance(theme.surfaceColor) > 0.5;
  const muted = light ? '#6D6257' : '#8C8678';
  const raised = light ? 'rgba(0,0,0,0.045)' : 'rgba(245,239,229,0.055)';
  return {
    '--bg': theme.surfaceColor,
    '--bg-elevated': theme.surfaceColor,
    '--bg-raised': raised,
    '--text': theme.textColor,
    '--text-muted': muted,
    '--text-dim': light ? '#978C80' : '#5A5548',
    '--accent': config.brandColor,
    '--accent-ink': config.accentColor,
    background: theme.surfaceColor,
    color: theme.textColor,
    colorScheme: light ? 'light' : 'dark',
    fontFamily: fontStack(theme.fontFamily),
  };
}

function fontStack(fontFamily: string) {
  if (!fontFamily || fontFamily === 'system') {
    return 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif';
  }
  return `${fontFamily}, var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif`;
}

function relativeLuminance(color: string) {
  const hex = color.trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 0;
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const channel = (value: number) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

async function errorMessage(res: Response, fallback: string) {
  try {
    const json = (await res.json()) as { message?: unknown };
    return typeof json.message === 'string' ? json.message : fallback;
  } catch {
    return fallback;
  }
}

function widgetHeaders(hostOrigin: string) {
  return {
    'Content-Type': 'application/json',
    ...(hostOrigin ? { 'X-Triage-Host-Origin': hostOrigin } : {}),
  };
}

async function postKbEvent(
  api: string,
  body: {
    widgetKey: string;
    query: string;
    outcome: 'solved' | 'submitted';
    articleId?: string;
    score?: number;
  },
) {
  try {
    await fetch(`${api}/api/v1/widget/kb/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Deflection analytics should never block the widget flow.
  }
}
