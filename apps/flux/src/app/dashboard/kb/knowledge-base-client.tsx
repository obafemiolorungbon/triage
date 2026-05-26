'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  KbArticleDto,
  KbImportProvider,
  KbImportResult,
} from '@triage/api-client';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';

const EMPTY_ARTICLE = {
  id: '',
  slug: '',
  title: '',
  body: '',
  published: false,
};

export default function KnowledgeBasePage() {
  const client = browserTicketsClient();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(EMPTY_ARTICLE);
  const [importOpen, setImportOpen] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [importProvider, setImportProvider] =
    useState<KbImportProvider>('intercom');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [preview, setPreview] = useState<KbImportResult | null>(null);
  const importCloseTimer = useRef<number | null>(null);
  const articlesQuery = useQuery({
    queryKey: ['kb-articles'],
    queryFn: () => client.listKbArticles(),
  });
  const selected = useMemo(
    () => (draft.id ? articlesQuery.data?.find((article) => article.id === draft.id) : null),
    [articlesQuery.data, draft.id],
  );

  useEffect(() => {
    if (!importVisible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeImportDrawer();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [importVisible]);

  useEffect(() => {
    return () => {
      if (importCloseTimer.current) {
        window.clearTimeout(importCloseTimer.current);
      }
    };
  }, []);

  function openImportDrawer() {
    if (importCloseTimer.current) {
      window.clearTimeout(importCloseTimer.current);
      importCloseTimer.current = null;
    }
    setImportVisible(true);
    window.requestAnimationFrame(() => setImportOpen(true));
  }

  function closeImportDrawer() {
    setImportOpen(false);
    if (importCloseTimer.current) window.clearTimeout(importCloseTimer.current);
    importCloseTimer.current = window.setTimeout(() => {
      setImportVisible(false);
      importCloseTimer.current = null;
    }, 240);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        slug: draft.slug || slugify(draft.title),
        title: draft.title,
        body: draft.body,
        published: draft.published,
      };
      return draft.id
        ? client.updateKbArticle(draft.id, payload)
        : client.createKbArticle(payload);
    },
    onSuccess: (article) => {
      setDraft(articleToDraft(article));
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.deleteKbArticle(id),
    onSuccess: () => {
      setDraft(EMPTY_ARTICLE);
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    },
  });
  const previewMutation = useMutation({
    mutationFn: () =>
      client.previewKbImport({
        provider: importProvider,
        payload: parseImportJson(importJson),
      }),
    onSuccess: (result) => {
      setPreview(result);
      setImportError('');
    },
    onError: (error) => {
      setPreview(null);
      setImportError(error instanceof Error ? error.message : 'Could not preview import.');
    },
  });
  const importMutation = useMutation({
    mutationFn: () =>
      client.importKbArticles({
        provider: importProvider,
        payload: parseImportJson(importJson),
      }),
    onSuccess: (result) => {
      setPreview(result);
      setImportError('');
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    },
    onError: (error) => {
      setImportError(error instanceof Error ? error.message : 'Could not import articles.');
    },
  });

  return (
    <div className="flex flex-col gap-6 lg:h-[calc(100dvh-5rem)] lg:min-h-0">
      <header className="shrink-0 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl tracking-tightest text-paper-50 font-medium">
            Knowledge base
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-paper-400">
            Publish focused support articles. The widget searches them before users submit
            feedback and can draft grounded answers from the matching chunks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={openImportDrawer}
          >
            <ImportIcon />
            Import
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setDraft(EMPTY_ARTICLE)}
          >
            New article
          </button>
        </div>
      </header>

      {importVisible && (
        <div
          className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ease-out ${
            importOpen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-paper-950/78 backdrop-blur-sm"
            aria-label="Close import drawer"
            onClick={closeImportDrawer}
          />
          <aside
            className={`surface-raised relative flex h-full w-full max-w-[1120px] flex-col overflow-hidden rounded-none border-l border-paper-100/10 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              importOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            aria-modal="true"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-paper-100/10 px-5 py-4 md:px-6">
              <header>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-lime/10 text-lime">
                    <ImportIcon />
                  </span>
                  <h2 className="text-2xl font-medium tracking-tight text-paper-50">
                    Import support articles
                  </h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-paper-400">
                  Paste or load vendor JSON, preview the changes, then import only
                  valid articles.
                </p>
              </header>
              <button
                type="button"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paper-100/[0.06] text-paper-300 transition-colors hover:bg-paper-100/[0.1] hover:text-paper-50"
                aria-label="Close import drawer"
                onClick={closeImportDrawer}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="grid flex-1 min-h-0 grid-rows-[auto_1fr_auto]">
              <div className="border-b border-paper-100/10 px-5 py-4 md:px-6">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-paper-500">
                      Source
                    </span>
                    <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-paper-100/[0.04] p-1 text-xs">
                      {IMPORT_PROVIDERS.map((provider) => (
                        <button
                          key={provider.value}
                          type="button"
                          className={`h-9 rounded-md px-3 font-medium transition-all duration-200 active:translate-y-px ${
                            importProvider === provider.value
                              ? 'bg-paper-100/10 text-paper-50 shadow-[inset_0_0_0_1px_rgba(245,239,229,0.08)]'
                              : 'text-paper-400 hover:bg-paper-100/[0.04] hover:text-paper-100'
                          }`}
                          onClick={() => {
                            setImportProvider(provider.value);
                            setPreview(null);
                            setImportError('');
                          }}
                        >
                          {provider.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="grid h-full content-end rounded-lg border border-paper-100/10 bg-paper-100/[0.03] px-3 py-2 text-sm text-paper-300 transition-colors hover:bg-paper-100/[0.05]">
                    <span className="text-xs font-medium text-paper-100">
                      Load .json file
                    </span>
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="mt-2 block w-full text-xs text-paper-400 file:mr-3 file:rounded-md file:border-0 file:bg-paper-100/10 file:px-3 file:py-2 file:text-paper-100"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setImportJson(String(reader.result ?? ''));
                          setPreview(null);
                          setImportError('');
                        };
                        reader.onerror = () => setImportError('Could not read JSON file.');
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid min-h-0 gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
                <label className="flex min-h-0 flex-col gap-2 border-b border-paper-100/10 p-5 md:p-6 lg:border-b-0 lg:border-r">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <span className="text-sm font-medium text-paper-200">
                        Export JSON
                      </span>
                      <p className="mt-1 text-xs text-paper-500">
                        Paste the raw article export object or array.
                      </p>
                    </div>
                    <span className="font-mono text-2xs uppercase tracking-wider text-paper-500">
                      {importJson.length.toLocaleString()} chars
                    </span>
                  </div>
                  <textarea
                    className="textarea min-h-[360px] flex-1 resize-none font-mono text-xs leading-5 lg:min-h-0"
                    value={importJson}
                    onChange={(event) => {
                      setImportJson(event.target.value);
                      setPreview(null);
                      setImportError('');
                    }}
                    placeholder='{"articles":[{"id":123,"title":"How to reset password","body":"<p>Open settings...</p>"}]}'
                  />
                </label>

                <aside className="min-h-0 overflow-y-auto p-5 md:p-6">
                  <ImportSummary preview={preview} />

                  {importError && (
                    <div className="mt-3 rounded-lg bg-[#ff5e5e14] px-3 py-2 text-sm text-[#FF9999]">
                      {importError}
                    </div>
                  )}

                  <div className="mt-5 rounded-lg border border-paper-100/10 bg-paper-100/[0.03] p-3">
                    <h3 className="text-sm font-medium text-paper-100">Import behavior</h3>
                    <div className="mt-3 space-y-2 text-xs text-paper-400">
                      <p>Existing source IDs are updated.</p>
                      <p>Duplicate slugs are safely suffixed.</p>
                      <p>Invalid rows are skipped with row-level errors.</p>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper-100/10 px-5 py-4 md:px-6">
                <p className="text-xs text-paper-500">
                  Preview writes nothing. Import writes valid rows and reindexes articles.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!importJson.trim() || previewMutation.isPending}
                    onClick={() => {
                      try {
                        parseImportJson(importJson);
                        previewMutation.mutate();
                      } catch (error) {
                        setPreview(null);
                        setImportError(
                          error instanceof Error ? error.message : 'Invalid JSON payload.',
                        );
                      }
                    }}
                  >
                    {previewMutation.isPending ? 'Previewing' : 'Preview import'}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={
                      !preview ||
                      preview.valid === 0 ||
                      importMutation.isPending ||
                      previewMutation.isPending
                    }
                    onClick={() => importMutation.mutate()}
                  >
                    {importMutation.isPending ? 'Importing' : 'Import valid articles'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[360px_1fr]">
        <section className="surface flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-paper-100/10 px-4 py-3">
            <span className="text-sm font-medium text-paper-200">Articles</span>
            <span className="font-mono text-2xs uppercase tracking-wider text-paper-500">
              {(articlesQuery.data ?? []).length} total
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
            {articlesQuery.isLoading && (
              <div className="flex justify-center py-12">
                <span className="spinner" />
              </div>
            )}
            {articlesQuery.isError && (
              <p className="text-sm text-[#FF9999]">Could not load articles.</p>
            )}
            <div className="space-y-2">
            {(articlesQuery.data ?? []).map((article) => (
              <button
                key={article.id}
                type="button"
                className={`w-full rounded-lg p-3 text-left transition-colors ${
                  draft.id === article.id
                    ? 'bg-paper-100/10 text-paper-50'
                    : 'bg-paper-100/[0.03] text-paper-300 hover:bg-paper-100/[0.06]'
                }`}
                onClick={() => setDraft(articleToDraft(article))}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{article.title}</span>
                  <span className="pill text-2xs">
                    {article.published ? 'Live' : 'Draft'}
                  </span>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-paper-500">
                  /{article.slug}
                </p>
                <p className="mt-2 text-xs text-paper-500">
                  {article._count?.chunks ?? article.chunks?.length ?? 0} chunks indexed
                </p>
              </button>
            ))}
            </div>
          </div>
        </section>

        <section className="surface flex min-h-0 flex-col overflow-hidden rounded-xl p-5">
          <form
            className="flex h-full min-h-0 flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-paper-300">Title</span>
                <input
                  className="input"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      title: event.target.value,
                      slug: prev.slug || slugify(event.target.value),
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-paper-300">Slug</span>
                <input
                  className="input font-mono"
                  value={draft.slug}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, slug: slugify(event.target.value) }))
                  }
                  required
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-lg bg-paper-100/[0.04] px-3 py-2 text-sm text-paper-200">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, published: event.target.checked }))
                }
              />
              Publish to the widget
            </label>

            <label className="flex min-h-0 flex-1 flex-col gap-2">
              <span className="text-sm text-paper-300">Markdown body</span>
              <textarea
                className="textarea min-h-[240px] flex-1 resize-none font-mono text-sm leading-6"
                value={draft.body}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, body: event.target.value }))
                }
                placeholder="Use H2/H3 headings to create searchable chunks."
                required
              />
            </label>

            {saveMutation.isError && (
              <div className="rounded-lg bg-[#ff5e5e14] px-3 py-2 text-sm text-[#FF9999]">
                {String(saveMutation.error)}
              </div>
            )}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-paper-500">
                {selected ? `Last indexed ${new Date(selected.updatedAt).toLocaleString()}` : 'New article'}
              </div>
              <div className="flex gap-2">
                {draft.id && (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(draft.id)}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Indexing' : 'Save article'}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

const IMPORT_PROVIDERS: { value: KbImportProvider; label: string }[] = [
  { value: 'intercom', label: 'Intercom' },
  { value: 'freshdesk', label: 'Freshdesk' },
  { value: 'zendesk', label: 'Zendesk' },
];

function articleToDraft(article: KbArticleDto) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    body: article.body,
    published: article.published,
  };
}

function parseImportJson(value: string) {
  if (!value.trim()) throw new Error('Paste export JSON before previewing.');
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error('Export JSON is not valid JSON.');
  }
}

function ImportSummary({ preview }: { preview: KbImportResult | null }) {
  if (!preview) {
    return (
      <div className="rounded-lg bg-paper-100/[0.03] p-3 text-sm text-paper-500">
        No preview yet.
      </div>
    );
  }
  const errors = preview.items.filter((item) => !item.valid).slice(0, 4);
  return (
    <div className="rounded-lg bg-paper-100/[0.03] p-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="Total" value={preview.total} />
        <Metric label="Valid" value={preview.valid} />
        <Metric label="Create" value={preview.creates} />
        <Metric label="Update" value={preview.updates} />
      </div>
      {typeof preview.imported === 'number' && (
        <p className="mt-3 text-sm text-paper-200">
          Imported {preview.imported} articles.
        </p>
      )}
      {errors.length > 0 && (
        <div className="mt-3 space-y-1 text-xs text-[#FFB8B8]">
          {errors.map((item) => (
            <p key={item.index}>
              Row {item.index + 1}: {item.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-paper-950/40 px-3 py-2">
      <div className="font-mono text-lg text-paper-50">{value}</div>
      <div className="text-paper-500">{label}</div>
    </div>
  );
}

function ImportIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 21h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18" />
    </svg>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}
