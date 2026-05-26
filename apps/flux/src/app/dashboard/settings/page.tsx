'use client';

import type { SettingsResponse } from '@triage/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';

export default function SettingsPage() {
  const client = browserTicketsClient();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: () => client.getSettings(),
  });
  const [draft, setDraft] = useState<SettingsResponse | null>(null);
  const [rulesText, setRulesText] = useState('[]');

  useEffect(() => {
    if (!data) return;
    setDraft(data);
    setRulesText(JSON.stringify(data.escalationRules, null, 2));
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Settings are not loaded');
      return client.updateSettings({
        ...draft,
        escalationRules: JSON.parse(rulesText),
      });
    },
    onSuccess: (next) => {
      setDraft(next);
      setRulesText(JSON.stringify(next.escalationRules, null, 2));
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  if (isLoading || !draft) {
    return (
      <div className="flex justify-center py-24">
        <span className="spinner" />
      </div>
    );
  }

  if (isError) {
    return <div className="surface rounded-xl p-6 text-[#FF9999]">Could not load settings.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-4xl md:text-5xl tracking-tightest text-paper-50 font-medium">
          Settings
        </h1>
        <p className="mt-2 text-sm text-paper-400">
          Configure company context, escalation, and issue automation.
        </p>
      </header>

      <section className="surface rounded-xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Company context" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Company name">
            <input
              className="input"
              value={draft.workspace.companyName}
              onChange={(e) =>
                setDraft({ ...draft, workspace: { ...draft.workspace, companyName: e.target.value } })
              }
            />
          </Field>
          <Field label="Industry">
            <input
              className="input"
              value={draft.workspace.industry}
              onChange={(e) =>
                setDraft({ ...draft, workspace: { ...draft.workspace, industry: e.target.value } })
              }
            />
          </Field>
        </div>
        <Field label="Product description">
          <textarea
            className="textarea min-h-24"
            value={draft.workspace.productDescription}
            onChange={(e) =>
              setDraft({
                ...draft,
                workspace: { ...draft.workspace, productDescription: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Support context">
          <textarea
            className="textarea min-h-24"
            value={draft.workspace.supportContext}
            onChange={(e) =>
              setDraft({ ...draft, workspace: { ...draft.workspace, supportContext: e.target.value } })
            }
          />
        </Field>
        <Field label="Escalation guidance">
          <textarea
            className="textarea min-h-24"
            value={draft.workspace.escalationGuidance}
            onChange={(e) =>
              setDraft({
                ...draft,
                workspace: { ...draft.workspace, escalationGuidance: e.target.value },
              })
            }
          />
        </Field>
        <Field label="AI context notes">
          <textarea
            className="textarea min-h-24"
            value={draft.workspace.aiContextNotes}
            onChange={(e) =>
              setDraft({ ...draft, workspace: { ...draft.workspace, aiContextNotes: e.target.value } })
            }
          />
        </Field>
      </section>

      <section className="surface rounded-xl p-5 md:p-6 space-y-4">
        <SectionTitle title="Escalation and automation" />
        <label className="inline-flex items-center gap-3 text-sm text-paper-200 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox"
            checked={draft.workspace.autoCreateCritical}
            onChange={(e) =>
              setDraft({
                ...draft,
                workspace: { ...draft.workspace, autoCreateCritical: e.target.checked },
              })
            }
          />
          Auto-create external issues for critical feedback
        </label>
        <Field label="Auto-create provider">
          <select
            className="select"
            value={draft.workspace.autoCreateProvider}
            onChange={(e) =>
              setDraft({
                ...draft,
                workspace: {
                  ...draft.workspace,
                  autoCreateProvider: e.target.value as 'linear' | 'jira',
                },
              })
            }
          >
            <option value="linear">Linear</option>
            <option value="jira">Jira</option>
          </select>
        </Field>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <StatusLine label="Linear" ready={draft.integrations.linear.configured} />
          <StatusLine label="Jira" ready={draft.integrations.jira.configured} />
        </div>
        <Field label="Escalation rules JSON">
          <textarea
            className="textarea min-h-64 font-mono !text-xs"
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
          />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Saving' : 'Save settings'}
        </button>
        {mutation.isError && (
          <span className="text-sm text-[#FF9999]">{String(mutation.error)}</span>
        )}
        {mutation.isSuccess && (
          <span className="text-sm text-lime">Saved</span>
        )}
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

function StatusLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-paper-100/[0.03] px-3 py-2">
      <span className="text-paper-300">{label}</span>
      <span className={ready ? 'text-lime' : 'text-paper-500'}>
        {ready ? 'Configured' : 'Missing env'}
      </span>
    </div>
  );
}
