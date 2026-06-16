'use client';

import type {
  AssistantMessage,
  AssistantQueryResponse,
  AssistantSource,
  AssistantToolCall,
} from '@triage/api-client';
import { useMutation } from '@tanstack/react-query';
import { Streamdown } from 'streamdown';
import type { FormEvent, MutableRefObject } from 'react';
import { useMemo, useRef, useState } from 'react';
import { browserTicketsClient } from '../../../lib/tickets-browser-client';

const PROMPTS = [
  'What are the top unresolved issues this week?',
  'Which knowledge gaps should we fix first?',
  'Summarize critical feedback that is still open.',
];

type TranscriptItem =
  | (AssistantMessage & { sources?: AssistantSource[] })
  | {
      role: 'assistant';
      content: string;
      createdAt?: string;
      pending?: boolean;
      error?: boolean;
      sources?: AssistantSource[];
    };

type AskRequest = {
  message: string;
  history: AssistantMessage[];
  createdAt: string;
};

type EvidencePanel = 'sources' | 'trace' | null;

export function AskAssistant() {
  const [messages, setMessages] = useState<TranscriptItem[]>([]);
  const [value, setValue] = useState('');
  const [lastResponse, setLastResponse] =
    useState<AssistantQueryResponse | null>(null);
  const [selectedCitationKey, setSelectedCitationKey] = useState<string | null>(
    null,
  );
  const [evidencePanel, setEvidencePanel] = useState<EvidencePanel>(null);
  const sourceRefs = useRef<Record<string, HTMLElement | null>>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const mutation = useMutation({
    mutationFn: (request: AskRequest) =>
      browserTicketsClient().askAssistant({
        message: request.message,
        history: request.history.slice(-12),
        maxToolCalls: 6,
      }),
    onMutate: (request) => {
      setLastResponse(null);
      setSelectedCitationKey(null);
      setEvidencePanel(null);
      sourceRefs.current = {};
      setMessages([
        ...request.history,
        {
          role: 'user',
          content: request.message,
          createdAt: request.createdAt,
        },
        {
          role: 'assistant',
          content: 'Reading Triage data...',
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ]);
      setValue('');
    },
    onSuccess: (response, request) => {
      const assistantMessage = response.messages
        .slice()
        .reverse()
        .find((message) => message.role === 'assistant');
      const assistantTranscriptMessage = {
        ...(assistantMessage ?? {
          role: 'assistant' as const,
          content: response.answer,
          createdAt: new Date().toISOString(),
        }),
        sources: response.sources,
      };
      setLastResponse(response);
      setMessages([
        ...request.history,
        {
          role: 'user',
          content: request.message,
          createdAt: request.createdAt,
        },
        assistantTranscriptMessage,
      ]);
    },
    onError: (error, request) => {
      setMessages([
        ...request.history,
        {
          role: 'user',
          content: request.message,
          createdAt: request.createdAt,
        },
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'The assistant could not complete the request.',
          createdAt: new Date().toISOString(),
          error: true,
        },
      ]);
    },
  });

  const hasConversation = messages.length > 0;
  const canSubmit = value.trim().length > 0 && !mutation.isPending;

  function submit(message: string) {
    const next = message.trim();
    if (!next || mutation.isPending) return;
    const history = messages
      .filter(
        (item): item is AssistantMessage =>
          !('pending' in item) && !('error' in item),
      )
      .slice(-12)
      .map(({ role, content, createdAt }) => ({ role, content, createdAt }));
    mutation.mutate({
      message: next,
      history,
      createdAt: new Date().toISOString(),
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(value);
  }

  function selectCitation(citationKey: string) {
    setSelectedCitationKey(citationKey);
    setEvidencePanel('sources');
    window.requestAnimationFrame(() => {
      sourceRefs.current[citationKey]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-5xl flex-col">
      {!hasConversation ? (
        <div className="grid flex-1 place-items-center py-12">
          <div className="w-full max-w-3xl">
            <div className="mb-5 text-center">
              <p className="font-mono text-2xs uppercase tracking-wider text-paper-500">
                Ask Triage
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tightest text-paper-50 md:text-4xl">
                Question your feedback data
              </h1>
            </div>
            <AskForm
              value={value}
              setValue={setValue}
              onSubmit={onSubmit}
              canSubmit={canSubmit}
              textareaRef={textareaRef}
              pending={mutation.isPending}
            />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submit(prompt)}
                  disabled={mutation.isPending}
                  className="hairline rounded-full px-3 py-1.5 text-xs text-paper-400 transition-colors hover:bg-paper-100/[0.045] hover:text-paper-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-5 pb-5">
            <div>
              <p className="font-mono text-2xs uppercase tracking-wider text-paper-500">
                Ask Triage
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tightest text-paper-50">
                Data assistant
              </h1>
            </div>
            <Transcript
              messages={messages}
              selectedCitationKey={selectedCitationKey}
              onCitationSelect={selectCitation}
            />
            {lastResponse && (
              <AssistantEvidence
                sources={lastResponse.sources}
                toolCalls={lastResponse.toolCalls}
                suggestedQuestions={lastResponse.suggestedQuestions}
                onPrompt={submit}
                selectedCitationKey={selectedCitationKey}
                activePanel={evidencePanel}
                onPanelChange={setEvidencePanel}
                sourceRefs={sourceRefs}
                onCitationSelect={selectCitation}
                disabled={mutation.isPending}
              />
            )}
          </div>
          <div className="sticky bottom-0 -mx-4 border-t border-paper-100/[0.075] bg-ink-900/90 px-4 py-4 backdrop-blur-xl md:-mx-7 md:px-7 lg:-mx-9 lg:px-9">
            <div className="mx-auto max-w-5xl">
              <AskForm
                value={value}
                setValue={setValue}
                onSubmit={onSubmit}
                canSubmit={canSubmit}
                textareaRef={textareaRef}
                pending={mutation.isPending}
                compact
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AskForm({
  value,
  setValue,
  onSubmit,
  canSubmit,
  textareaRef,
  pending,
  compact,
}: {
  value: string;
  setValue: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canSubmit: boolean;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  pending: boolean;
  compact?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`surface-raised flex items-end gap-3 rounded-2xl p-3 ${compact ? '' : 'md:p-4'}`}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        rows={compact ? 2 : 3}
        maxLength={4000}
        placeholder="Ask about tickets, knowledge gaps, deflections, or trends"
        className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-paper-50 outline-none placeholder:text-paper-500"
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime text-ink-900 transition-all hover:bg-lime-bright disabled:cursor-not-allowed disabled:opacity-45"
        aria-label="Ask"
      >
        {pending ? (
          <span className="spinner !h-4 !w-4 !border-ink-900/20 !border-t-ink-900" />
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M3 8h9M8.5 3.5L13 8l-4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </form>
  );
}

function Transcript({
  messages,
  selectedCitationKey,
  onCitationSelect,
}: {
  messages: TranscriptItem[];
  selectedCitationKey: string | null;
  onCitationSelect: (citationKey: string) => void;
}) {
  return (
    <ol className="space-y-4">
      {messages.map((message, index) => (
        <li
          key={`${message.role}-${index}-${message.createdAt ?? ''}`}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[min(42rem,92%)] rounded-2xl px-4 py-3 text-sm leading-6 ${
              message.role === 'user'
                ? 'bg-lime text-ink-900'
                : 'surface text-paper-100'
            } ${'pending' in message && message.pending ? 'text-paper-400' : ''} ${
              'error' in message && message.error ? 'text-[#F0A49A]' : ''
            }`}
          >
            <AssistantMarkdown
              text={message.content}
              sources={message.sources ?? []}
              selectedCitationKey={selectedCitationKey}
              onCitationSelect={onCitationSelect}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function AssistantEvidence({
  sources,
  toolCalls,
  suggestedQuestions,
  onPrompt,
  selectedCitationKey,
  activePanel,
  onPanelChange,
  sourceRefs,
  onCitationSelect,
  disabled,
}: {
  sources: AssistantSource[];
  toolCalls: AssistantToolCall[];
  suggestedQuestions: string[];
  onPrompt: (prompt: string) => void;
  selectedCitationKey: string | null;
  activePanel: EvidencePanel;
  onPanelChange: (panel: EvidencePanel) => void;
  sourceRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onCitationSelect: (citationKey: string) => void;
  disabled: boolean;
}) {
  const visibleSources = useMemo(() => sources.slice(0, 8), [sources]);
  const togglePanel = (panel: Exclude<EvidencePanel, null>) => {
    onPanelChange(activePanel === panel ? null : panel);
  };

  return (
    <section className="surface rounded-2xl p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => togglePanel('sources')}
            className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs transition-colors ${
              activePanel === 'sources'
                ? 'bg-lime text-ink-900'
                : 'hairline text-paper-300 hover:bg-paper-100/[0.045] hover:text-paper-50'
            }`}
            aria-expanded={activePanel === 'sources'}
          >
            Sources
            <span className="font-mono tabular-nums">
              {visibleSources.length}/{sources.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => togglePanel('trace')}
            className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs transition-colors ${
              activePanel === 'trace'
                ? 'bg-lime text-ink-900'
                : 'hairline text-paper-300 hover:bg-paper-100/[0.045] hover:text-paper-50'
            }`}
            aria-expanded={activePanel === 'trace'}
          >
            Trace
            <span className="font-mono tabular-nums">{toolCalls.length}</span>
          </button>
          {selectedCitationKey && (
            <span className="hidden font-mono text-2xs uppercase tracking-wider text-paper-500 sm:inline">
              selected {selectedCitationKey}
            </span>
          )}
        </div>
        {activePanel && (
          <button
            type="button"
            onClick={() => onPanelChange(null)}
            className="h-8 rounded-full px-3 text-xs text-paper-500 transition-colors hover:bg-paper-100/[0.045] hover:text-paper-100"
          >
            Hide
          </button>
        )}
      </div>

      {activePanel === 'sources' && (
        <div className="mt-2 border-t border-paper-100/[0.06] pt-3">
          {visibleSources.length === 0 ? (
            <p className="px-2 pb-1 text-sm text-paper-500">
              No records were cited.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {visibleSources.map((source, index) => (
                <SourceCard
                  key={`${source.type}-${source.id}`}
                  source={source}
                  fallbackCitationKey={`S${index + 1}`}
                  selectedCitationKey={selectedCitationKey}
                  sourceRefs={sourceRefs}
                  onCitationSelect={onCitationSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activePanel === 'trace' && (
        <div className="mt-2 border-t border-paper-100/[0.06] px-2 pt-3">
          <ol className="space-y-2">
            {toolCalls.map((call, index) => (
              <li
                key={`${call.name}-${index}`}
                className="flex items-center justify-between gap-3 text-xs text-paper-400"
              >
                <span className="min-w-0 truncate text-paper-200">
                  {call.name}
                </span>
                <span className="shrink-0 font-mono text-paper-500">
                  {call.status}
                  {typeof call.sourceCount === 'number'
                    ? ` / ${call.sourceCount}`
                    : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {suggestedQuestions.length > 0 && (
        <div className="mt-2 border-t border-paper-100/[0.06] pt-2">
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onPrompt(question)}
                disabled={disabled}
                className="hairline rounded-full px-3 py-1.5 text-xs text-paper-400 transition-colors hover:bg-paper-100/[0.045] hover:text-paper-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SourceCard({
  source,
  fallbackCitationKey,
  selectedCitationKey,
  sourceRefs,
  onCitationSelect,
}: {
  source: AssistantSource;
  fallbackCitationKey: string;
  selectedCitationKey: string | null;
  sourceRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onCitationSelect: (citationKey: string) => void;
}) {
  const citationKey = source.citationKey ?? fallbackCitationKey;
  const isSelected = selectedCitationKey === citationKey;
  const href = source.href;
  const isExternal = Boolean(href && /^https?:\/\//.test(href));

  return (
    <article
      ref={(node) => {
        sourceRefs.current[citationKey] = node;
      }}
      className={`group rounded-xl p-3 transition-all duration-200 ${
        isSelected
          ? 'bg-lime-dim shadow-[inset_0_0_0_1px_rgba(184,214,107,0.55)]'
          : 'hairline bg-paper-100/[0.018] hover:bg-paper-100/[0.045]'
      }`}
    >
      <button
        type="button"
        onClick={() => onCitationSelect(citationKey)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="font-mono text-2xs uppercase tracking-wider text-paper-500">
            {source.type.replace('_', ' ')}
          </span>
          <span className="mt-1 block truncate text-sm font-medium text-paper-100">
            {source.label}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-1 font-mono text-2xs tabular-nums ${
            isSelected
              ? 'bg-lime text-ink-900'
              : 'bg-paper-100/[0.07] text-lime'
          }`}
        >
          {citationKey}
        </span>
      </button>
      {source.excerpt && (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-paper-400">
          {source.excerpt}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        {typeof source.score === 'number' ? (
          <span className="font-mono text-2xs tabular-nums text-paper-500">
            score {source.score.toFixed(2)}
          </span>
        ) : (
          <span className="font-mono text-2xs text-paper-600">evidence</span>
        )}
        {href && (
          <a
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noreferrer' : undefined}
            className="inline-flex h-7 items-center rounded-full px-2.5 text-xs text-paper-300 transition-colors hover:bg-paper-100/[0.07] hover:text-lime"
          >
            Open
          </a>
        )}
      </div>
    </article>
  );
}

function AssistantMarkdown({
  text,
  sources,
  selectedCitationKey,
  onCitationSelect,
}: {
  text: string;
  sources: AssistantSource[];
  selectedCitationKey: string | null;
  onCitationSelect: (citationKey: string) => void;
}) {
  const sourceMap = useMemo(() => {
    const map = new Map<string, AssistantSource>();
    sources.forEach((source) => {
      if (source.citationKey) map.set(source.citationKey, source);
    });
    return map;
  }, [sources]);

  return (
    <Streamdown
      mode="static"
      controls={false}
      allowedTags={{ 'triage-cite': [] }}
      literalTagContent={['triage-cite']}
      className="space-y-3"
      components={{
        p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
        ul: ({ children }) => (
          <ul className="ml-4 list-disc space-y-1.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="ml-4 list-decimal space-y-1.5">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-paper-50">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="rounded bg-paper-100/[0.08] px-1 font-mono text-[0.85em] text-paper-200">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded-xl bg-ink-950/80 p-3 font-mono text-xs leading-5 text-paper-200">
            {children}
          </pre>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-lime underline decoration-lime/35 underline-offset-2 transition-colors hover:text-lime-bright"
          >
            {children}
          </a>
        ),
        'triage-cite': ({ children }) => {
          const citationKeys = [
            ...String(children ?? '').matchAll(/\bS\d+\b/g),
          ].map((match) => match[0]);
          if (citationKeys.length === 0) {
            return (
              <span className="mx-0.5 inline-flex rounded-full bg-lime-dim px-1.5 font-mono text-[0.78em] uppercase tracking-wide text-lime">
                {String(children ?? '')}
              </span>
            );
          }
          return (
            <span className="mx-0.5 inline-flex align-baseline">
              {citationKeys.map((citationKey) => {
                const source = sourceMap.get(citationKey);
                const isSelected = selectedCitationKey === citationKey;
                if (!source) {
                  return (
                    <span
                      key={citationKey}
                      className="mx-0.5 inline-flex h-5 items-center rounded-full bg-paper-100/[0.07] px-1.5 font-mono text-[0.78em] uppercase tracking-wide text-paper-500"
                    >
                      {citationKey}
                    </span>
                  );
                }
                return (
                  <button
                    key={citationKey}
                    type="button"
                    title={source.label}
                    onClick={() => onCitationSelect(citationKey)}
                    className={`mx-0.5 inline-flex h-5 items-center rounded-full px-1.5 font-mono text-[0.78em] uppercase tracking-wide transition-all ${
                      isSelected
                        ? 'bg-lime text-ink-900'
                        : 'bg-lime-dim text-lime hover:bg-lime hover:text-ink-900'
                    }`}
                  >
                    {citationKey}
                  </button>
                );
              })}
            </span>
          );
        },
      }}
    >
      {markCitations(text)}
    </Streamdown>
  );
}

function markCitations(text: string) {
  return text.replace(/\[([^\]\n]+)\](?!\()/g, (_match, label: string) => {
    if (label.includes('http://') || label.includes('https://'))
      return `[${label}]`;
    return `<triage-cite>[${label}]</triage-cite>`;
  });
}
