'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { Drawer } from 'vaul';
import type {
  KbArticleDto,
  KbImportProvider,
  KbImportResult,
} from '@triage/api-client';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';
import { EmptyState } from '../../../components/ui/empty-state';

type ArticleDraft = {
  id: string;
  slug: string;
  title: string;
  body: string;
  published: boolean;
};

const EMPTY_ARTICLE: ArticleDraft = {
  id: '',
  slug: '',
  title: '',
  body: '',
  published: false,
};

export default function KnowledgeBasePage() {
  const client = browserTicketsClient();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ArticleDraft>(EMPTY_ARTICLE);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importProvider, setImportProvider] =
    useState<KbImportProvider>('intercom');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [preview, setPreview] = useState<KbImportResult | null>(null);

  const articlesQuery = useQuery({
    queryKey: ['kb-articles'],
    queryFn: () => client.listKbArticles(),
  });

  const selected = draft.id
    ? articlesQuery.data?.find((article) => article.id === draft.id)
    : null;

  function openCreateDialog() {
    setDraft(EMPTY_ARTICLE);
    setCreateOpen(true);
  }

  function openEditDrawer(article: KbArticleDto) {
    setDraft(articleToDraft(article));
    setEditOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (nextDraft: ArticleDraft) => {
      const payload = {
        slug: nextDraft.slug || slugify(nextDraft.title),
        title: nextDraft.title,
        body: nextDraft.body,
        published: nextDraft.published,
      };
      return nextDraft.id
        ? client.updateKbArticle(nextDraft.id, payload)
        : client.createKbArticle(payload);
    },
    onSuccess: (article) => {
      setDraft(articleToDraft(article));
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.deleteKbArticle(id),
    onSuccess: () => {
      setDraft(EMPTY_ARTICLE);
      setEditOpen(false);
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
      <header className="shrink-0">
        <h1 className="text-4xl font-medium tracking-tightest text-paper-50 md:text-5xl">
          Knowledge base
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-paper-400">
          Publish focused support articles. The widget searches them before users submit feedback and can draft grounded answers from matching chunks.
        </p>
      </header>

      <section className="surface flex min-h-[420px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-paper-100/10 bg-ink-800/95 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-paper-200">Articles</span>
              <span className="pill text-2xs">{(articlesQuery.data ?? []).length} total</span>
            </div>
            <p className="mt-1 text-xs text-paper-500">
              Open a row to update content, publishing, or indexing metadata.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setImportOpen(true)}
            >
              <ImportIcon />
              Import
            </button>
            <button type="button" className="btn-primary btn-sm" onClick={openCreateDialog}>
              New article
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {articlesQuery.isLoading && <ArticleSkeleton />}

          {articlesQuery.isError && (
            <p className="px-4 py-5 text-sm text-[#FF9999]">Could not load articles.</p>
          )}

          {!articlesQuery.isLoading &&
            !articlesQuery.isError &&
            (articlesQuery.data ?? []).length === 0 && (
              <div className="p-5">
                <EmptyState
                  variant="kb"
                  tone="plain"
                  title="No articles yet"
                  description="Add a focused answer the widget can suggest before users submit feedback."
                  actions={
                    <>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={openCreateDialog}
                      >
                        New article
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => setImportOpen(true)}
                      >
                        Import
                      </button>
                    </>
                  }
                />
              </div>
            )}

          {(articlesQuery.data ?? []).length > 0 && (
            <ul className="divide-y divide-paper-100/[0.055]">
              {(articlesQuery.data ?? []).map((article) => (
                <li key={article.id}>
                  <button
                    type="button"
                    className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-paper-100/[0.035] md:grid-cols-[minmax(0,1fr)_8rem_9rem_7rem] md:items-center"
                    onClick={() => openEditDrawer(article)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-paper-100">
                        {article.title}
                      </span>
                      <span className="mt-1 block truncate font-mono text-xs text-paper-500">
                        /{article.slug}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-paper-500">
                      {article._count?.chunks ?? article.chunks?.length ?? 0} chunks
                    </span>
                    <span className="font-mono text-xs text-paper-500">
                      {formatDate(article.updatedAt)}
                    </span>
                    <span className="justify-self-start md:justify-self-end">
                      <span className="pill text-2xs">
                        {article.published ? 'Live' : 'Draft'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {createOpen && (
        <ArticleDialog
          draft={draft}
          setDraft={setDraft}
          busy={saveMutation.isPending}
          error={saveMutation.isError ? String(saveMutation.error) : ''}
          onClose={() => setCreateOpen(false)}
          onSubmit={() => saveMutation.mutate(draft)}
        />
      )}

      {editOpen && (
        <ArticleEditDrawer
          draft={draft}
          setDraft={setDraft}
          busy={saveMutation.isPending}
          deleteBusy={deleteMutation.isPending}
          error={saveMutation.isError ? String(saveMutation.error) : ''}
          lastIndexed={selected ? new Date(selected.updatedAt).toLocaleString() : ''}
          onClose={() => setEditOpen(false)}
          onDelete={() => draft.id && deleteMutation.mutate(draft.id)}
          onSubmit={() => saveMutation.mutate(draft)}
        />
      )}

      {importOpen && (
        <ImportDrawer
          importProvider={importProvider}
          setImportProvider={setImportProvider}
          importJson={importJson}
          setImportJson={setImportJson}
          importError={importError}
          setImportError={setImportError}
          preview={preview}
          setPreview={setPreview}
          previewMutation={previewMutation}
          importMutation={importMutation}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}

function ArticleDialog({
  draft,
  setDraft,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  draft: ArticleDraft;
  setDraft: Dispatch<SetStateAction<ArticleDraft>>;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink-950/72 px-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-article-title"
        className="surface-raised flex max-h-[min(760px,calc(100dvh-32px))] w-full max-w-2xl flex-col overflow-hidden rounded-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-paper-100/10 px-5 py-4">
          <div>
            <p className="font-mono text-2xs uppercase tracking-wider text-paper-500">
              New article
            </p>
            <h2 id="create-article-title" className="mt-1 text-xl font-medium text-paper-50">
              Create support article
            </h2>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg bg-paper-100/[0.06] text-paper-300 transition-colors hover:bg-paper-100/[0.1] hover:text-paper-50"
            onClick={onClose}
            aria-label="Close create article dialog"
          >
            <CloseIcon />
          </button>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-thin">
            <ArticleFields draft={draft} setDraft={setDraft} />
            {error && <FormError message={error} />}
          </div>
          <div className="border-t border-paper-100/10 p-5">
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Creating' : 'Create article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ArticleEditDrawer({
  draft,
  setDraft,
  busy,
  deleteBusy,
  error,
  lastIndexed,
  onClose,
  onDelete,
  onSubmit,
}: {
  draft: ArticleDraft;
  setDraft: Dispatch<SetStateAction<ArticleDraft>>;
  busy: boolean;
  deleteBusy: boolean;
  error: string;
  lastIndexed: string;
  onClose: () => void;
  onDelete: () => void;
  onSubmit: () => void;
}) {
  return (
    <Drawer.Root direction="right" open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-y-0 left-0 right-0 z-40 bg-ink-950/72 backdrop-blur-[2px] lg:left-[280px]" />
        <Drawer.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col overflow-hidden border-l border-paper-100/10 bg-ink-900 shadow-2xl outline-none lg:w-[min(760px,calc(100vw-280px))]">
          <div className="flex items-start justify-between gap-4 border-b border-paper-100/10 px-5 py-4 md:px-6">
            <header className="min-w-0">
              <p className="font-mono text-2xs uppercase tracking-wider text-paper-500">
                Edit article
              </p>
              <Drawer.Title className="mt-1 truncate text-2xl font-medium tracking-tight text-paper-50">
                {draft.title || 'Untitled article'}
              </Drawer.Title>
              <Drawer.Description className="mt-1 text-sm text-paper-500">
                {lastIndexed ? `Last indexed ${lastIndexed}` : 'Update article content and publishing state.'}
              </Drawer.Description>
            </header>
            <Drawer.Close className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paper-100/[0.06] text-paper-300 transition-colors hover:bg-paper-100/[0.1] hover:text-paper-50">
              <span className="sr-only">Close article editor</span>
              <CloseIcon />
            </Drawer.Close>
          </div>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-thin md:p-6">
              <ArticleFields draft={draft} setDraft={setDraft} />
              {error && <FormError message={error} />}
              <div className="mt-4">
                <button
                  type="button"
                  className="btn-secondary w-full"
                  disabled={deleteBusy || busy}
                  onClick={onDelete}
                >
                  {deleteBusy ? 'Deleting' : 'Delete article'}
                </button>
              </div>
            </div>
            <div className="border-t border-paper-100/10 p-5 md:p-6">
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Updating' : 'Update article'}
              </button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ArticleFields({
  draft,
  setDraft,
}: {
  draft: ArticleDraft;
  setDraft: Dispatch<SetStateAction<ArticleDraft>>;
}) {
  return (
    <div className="space-y-4">
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
          className="checkbox"
          checked={draft.published}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, published: event.target.checked }))
          }
        />
        Publish to the widget
      </label>

      <label className="flex min-h-[340px] flex-col gap-2">
        <span className="text-sm text-paper-300">Markdown body</span>
        <textarea
          className="textarea min-h-[340px] flex-1 resize-y font-mono text-sm leading-6"
          value={draft.body}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, body: event.target.value }))
          }
          placeholder="Use H2/H3 headings to create searchable chunks."
          required
        />
      </label>
    </div>
  );
}

function ImportDrawer({
  importProvider,
  setImportProvider,
  importJson,
  setImportJson,
  importError,
  setImportError,
  preview,
  setPreview,
  previewMutation,
  importMutation,
  onClose,
}: {
  importProvider: KbImportProvider;
  setImportProvider: (provider: KbImportProvider) => void;
  importJson: string;
  setImportJson: (value: string) => void;
  importError: string;
  setImportError: (value: string) => void;
  preview: KbImportResult | null;
  setPreview: (value: KbImportResult | null) => void;
  previewMutation: UseMutationResult<KbImportResult, Error, void, unknown>;
  importMutation: UseMutationResult<KbImportResult, Error, void, unknown>;
  onClose: () => void;
}) {
  return (
    <Drawer.Root direction="right" open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-y-0 left-0 right-0 z-40 bg-ink-950/72 backdrop-blur-[2px] lg:left-[280px]" />
        <Drawer.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col overflow-hidden border-l border-paper-100/10 bg-ink-900 shadow-2xl outline-none lg:w-[min(1120px,calc(100vw-280px))]">
          <div className="flex items-start justify-between gap-4 border-b border-paper-100/10 px-5 py-4 md:px-6">
            <header>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-lime/10 text-lime">
                  <ImportIcon />
                </span>
                <Drawer.Title className="text-2xl font-medium tracking-tight text-paper-50">
                  Import support articles
                </Drawer.Title>
              </div>
              <Drawer.Description className="mt-2 max-w-2xl text-sm text-paper-400">
                Paste or load vendor JSON, preview the changes, then import only valid articles.
              </Drawer.Description>
            </header>
            <Drawer.Close
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paper-100/[0.06] text-paper-300 transition-colors hover:bg-paper-100/[0.1] hover:text-paper-50"
              aria-label="Close import drawer"
            >
              <CloseIcon />
            </Drawer.Close>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr_auto]">
            <div className="border-b border-paper-100/10 px-5 py-4 md:px-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
                <div>
                  <span className="font-mono text-xs uppercase tracking-wider text-paper-500">
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
                  <span className="text-xs font-medium text-paper-100">Load .json file</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="file-input mt-2 text-xs"
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
                    <span className="text-sm font-medium text-paper-200">Export JSON</span>
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

const IMPORT_PROVIDERS: { value: KbImportProvider; label: string }[] = [
  { value: 'intercom', label: 'Intercom' },
  { value: 'freshdesk', label: 'Freshdesk' },
  { value: 'zendesk', label: 'Zendesk' },
];

function articleToDraft(article: KbArticleDto): ArticleDraft {
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

function ArticleSkeleton() {
  return (
    <div className="divide-y divide-paper-100/[0.055]">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_8rem_9rem_7rem]">
          <span className="h-9 rounded bg-paper-100/[0.055]" />
          <span className="h-5 rounded bg-paper-100/[0.04]" />
          <span className="h-5 rounded bg-paper-100/[0.04]" />
          <span className="h-5 rounded-full bg-paper-100/[0.04]" />
        </div>
      ))}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg bg-[#ff5e5e14] px-3 py-2 text-sm text-[#FF9999]">
      {message}
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}
