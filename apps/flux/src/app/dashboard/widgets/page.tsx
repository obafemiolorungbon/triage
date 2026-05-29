'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';
import { EmptyState } from '../../../components/ui/empty-state';
import { PalettePresetPicker, WIDGET_PALETTES, paletteTheme } from './color-palettes';

const DEFAULT_WIDGET = {
  name: 'Website widget',
  brandColor: '#B8D66B',
  accentColor: '#151412',
  position: 'bottom-right',
  size: 'md',
  title: 'Send feedback',
  description: 'Tell us what happened or what could be better.',
  successMessage: 'Thanks. Your feedback was received.',
  enabledUserFields: ['email', 'name'],
  requiredUserFields: ['email'],
  enabledMetadataKeys: ['plan', 'environment', 'accountId', 'url'],
};

export default function WidgetsPage() {
  const client = browserTicketsClient();
  const queryClient = useQueryClient();
  const [selectedPalette, setSelectedPalette] = useState(WIDGET_PALETTES[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const widgetsQuery = useQuery({
    queryKey: ['widgets'],
    queryFn: () => client.listWidgets(),
  });
  const createMutation = useMutation({
    mutationFn: () =>
      client.createWidget({
        ...DEFAULT_WIDGET,
        name: `Widget ${(widgetsQuery.data?.length ?? 0) + 1}`,
        brandColor: selectedPalette.brandColor,
        accentColor: selectedPalette.accentColor,
        theme: paletteTheme(selectedPalette),
      }),
    onSuccess: () => {
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
    },
  });
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => client.duplicateWidget(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widgets'] }),
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => client.archiveWidget(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widgets'] }),
  });

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tightest text-paper-50 md:text-5xl">
            Widgets
          </h1>
          <p className="mt-2 text-sm text-paper-400">
            Create separate widget keys for marketing sites, app surfaces, and experiments.
          </p>
        </div>
        <button
          type="button"
          className={createOpen ? 'btn-secondary' : 'btn-primary'}
          onClick={() => setCreateOpen((open) => !open)}
        >
          {createOpen ? 'Cancel' : 'Create widget'}
        </button>
      </header>

      {createOpen && (
        <section className="surface rounded-2xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-2xs uppercase tracking-wider text-paper-500">
                New widget
              </p>
              <h2 className="mt-1 text-lg font-medium text-paper-50">
                Choose a starting palette
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-paper-400">
                The palette seeds the launcher, form surface, text, and success state. You can tune every value after creation.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary w-full lg:w-auto"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating' : 'Create with selected palette'}
            </button>
          </div>
          <div className="mt-5">
            <PalettePresetPicker value={selectedPalette.id} onChange={setSelectedPalette} />
          </div>
        </section>
      )}

      {widgetsQuery.isLoading && (
        <div className="flex justify-center py-20">
          <span className="spinner" />
        </div>
      )}

      {widgetsQuery.isError && (
        <div className="surface rounded-2xl p-5 text-[#F0A49A]">
          Could not load widgets.
        </div>
      )}

      {!widgetsQuery.isLoading && !widgetsQuery.isError && (widgetsQuery.data ?? []).length === 0 && (
        <EmptyState
          variant="widgets"
          title="Create your first feedback widget"
          description="Start with one widget for your marketing site, then duplicate it for in-app feedback or experiments."
          actions={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreateOpen(true)}
            >
              Create widget
            </button>
          }
        />
      )}

      {(widgetsQuery.data ?? []).length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(widgetsQuery.data ?? []).map((widget) => (
          <article key={widget.id} className="surface group overflow-hidden rounded-2xl p-5">
            <div
              className="mb-5 h-1.5 rounded-full"
              style={{ background: widget.brandColor }}
              aria-hidden
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium tracking-tight text-paper-50">
                  {widget.name}
                </h2>
                <p className="mt-1 text-xs font-mono text-paper-500">
                  {widget.widgetKey}
                </p>
              </div>
              <span className="pill">{widget.archivedAt ? 'Archived' : 'Live'}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-2xs uppercase tracking-wider">
              <span className="pill">{widget.position}</span>
              <span className="pill">{widget.size}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/dashboard/widgets/${widget.id}`} className="btn-primary btn-sm">
                Edit
              </Link>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={duplicateMutation.isPending}
                onClick={() => duplicateMutation.mutate(widget.id)}
              >
                Duplicate
              </button>
              {!widget.archivedAt && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={archiveMutation.isPending}
                  onClick={() => archiveMutation.mutate(widget.id)}
                >
                  Archive
                </button>
              )}
            </div>
          </article>
          ))}
        </div>
      )}
    </div>
  );
}
