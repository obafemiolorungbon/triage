# Assistant UX: Next Five Upgrades

Date: June 15, 2026  
Status: proposed  
Scope: Flux Ask UI + assistant API response shape (read-only assistant)  
Depends on: agentic RAG foundation (`docs/agentic-rag-day-1-spec.md`)

## Purpose

Tool calling in Triage is already more than a database wrapper: it returns
`AssistantQueryResponse` with answer prose, citations, sources, tool traces, steps,
stop reasons, and suggested follow-ups. This plan turns that payload into **production-grade
product UX** — transparency when data may be incomplete, structured views beyond markdown,
and recovery paths when retrieval or synthesis misses something.

The five upgrades are ordered by **value / effort** and mapped explicitly to today's
response fields in `libs/shared-types/src/index.ts`.

---

## Current response contract (baseline)

```ts
type AssistantQueryResponse = {
  runId: string;
  answer: string;
  messages: AssistantMessage[];
  sources: AssistantSource[];       // citable evidence, href, scores
  toolCalls: AssistantToolCall[]; // name, status, input, summary, sourceCount, step
  steps: AssistantStepTrace[];    // per-model-step timing, tokens, sourceIds
  stopReason: AssistantStopReason;
  durationMs: number;
  usage?: { inputTokens?; outputTokens?; totalTokens? };
  suggestedQuestions: string[];
};
```

### What Flux uses today

| Field | UI today (`ask-assistant.tsx`) | Gap |
|-------|-------------------------------|-----|
| `answer` | Markdown transcript with clickable `[S1]` | Good |
| `sources` | Source cards (max 8 visible) | No type-specific layout; analytics = text excerpt |
| `toolCalls` | Trace panel: name + status + sourceCount | `input` and `summary` not shown |
| `steps` | Not rendered | Users see only "Reading Triage data…" while pending |
| `stopReason` | Not surfaced | Thin/partial answers look complete |
| `suggestedQuestions` | Text chips that re-submit natural language | No structured recovery; model may mis-route again |
| `durationMs` / `usage` | Not shown | No trust/debug signal for power users |

---

## Upgrade 1: Query transparency (what was searched)

### Problem

Users cannot tell whether a miss is "no data" or "wrong filters/query." The model may
search `resolution=open` + `period=this_week` while the user expected all time.

### Solution

Render **human-readable search context** from existing `toolCalls[].input` — no LLM
required. Show query string, filters, limits, and tool name per completed call.

### Maps to existing fields

- **Primary:** `toolCalls[]` — `name`, `status`, `input`, `summary`, `sourceCount`, `durationMs`, `step`
- **Secondary:** `steps[]` — group calls by model step

### Implementation

#### Backend (optional, small)

1. Add pure function `formatToolCallInput(name, input) → { label, chips: string[] }` in
   `apps/backend/src/assistant/assistant-run-presenter.ts` (new).
2. Optionally attach to response as `toolCallPresentations: Array<{ index, chips, label }>` —
   **only if** you want one formatting source for API clients. Otherwise format in Flux only.

Recommended: **Flux-only first** (no schema change).

#### Frontend

1. In `AssistantEvidence`, add panel **"Searched"** (or expand Trace):
   - For each `toolCalls` where `status === 'completed'`:
     - Title: `searchFeedback` → "Feedback search"
     - Chips from `input`: `query`, `resolution`, `period`, `withinDays`, `status`, `limit`, etc.
     - Subline: `summary` + `sourceCount` + `durationMs`
   - For `skipped` / `failed`: show reason from `summary` (duplicate, budget, failure).
2. Add `formatToolInput.ts` in `apps/flux/src/app/dashboard/ask/` with mappings aligned to
   `assistant-tool-schemas.ts` enums.

#### Files

| File | Change |
|------|--------|
| `apps/flux/src/app/dashboard/ask/ask-assistant.tsx` | New Searched panel / richer Trace |
| `apps/flux/src/app/dashboard/ask/format-tool-input.ts` | New formatter |
| `apps/backend/src/assistant/assistant-tool-schemas.ts` | Reference for chip labels (read-only) |

### Acceptance criteria

- [ ] After a run, user can see exact `query` and filters used for each completed tool.
- [ ] Skipped duplicate / budget-exhausted calls are visible with plain-language explanation.
- [ ] No new API fields required for v1.

### Effort

**S** — 1–2 days

---

## Upgrade 2: Completeness and confidence signals

### Problem

Answers can be **technically valid** but **incomplete**: `limit: 8` when hundreds match,
`step_limit` with partial evidence, `no_evidence` vs `model_failure`, sources truncated by
16-source / 24k-char budgets. Today `stopReason` is invisible; users assume full coverage.

### Solution

Surface a **run status banner** derived from `stopReason`, `toolCalls`, `sources`, and
optional new **`runMeta`** block with counts the backend already knows at finalize time.

### Maps to existing fields

- **Primary:** `stopReason`, `sources.length`, `toolCalls`, `durationMs`
- **New (recommended):** `runMeta` on `AssistantQueryResponse`

### Proposed schema extension (`libs/shared-types`)

```ts
export const assistantRunMetaSchema = z.object({
  sourceLimit: z.number().int().min(1),
  sourceCount: z.number().int().min(0),
  sourcesTruncated: z.boolean(),
  toolCallsExecuted: z.number().int().min(0),
  toolCallsSkipped: z.number().int().min(0),
  analyticsTotal: z.number().int().min(0).optional(), // from analyzeFeedback when present
  searchResultCount: z.number().int().min(0).optional(), // max sourceCount from search tools
  citationRepairUsed: z.boolean().optional(),
});
```

Populate in `LocalAssistantOrchestrator.finalize()`:

- `sourcesTruncated`: true if registry hit `maxSources` or `maxEvidenceCharacters`
- `analyticsTotal`: parse from analytics tool `data.total` if last analyze call succeeded
- `searchResultCount`: highest `sourceCount` from `searchFeedback` / `searchKnowledge` calls
- `citationRepairUsed`: set flag in orchestrator when repair path runs

### Frontend

1. **Banner** above transcript or evidence panel:
   - `answered` + no truncation → subtle "Based on N sources" (optional)
   - `answered` + `sourcesTruncated` → "Showing N sources; more evidence was retrieved but omitted due to limits."
   - `no_evidence` / `tool_failure` / `model_failure` → amber/red banner with actionable copy
   - `step_limit` / `tool_call_limit` → "Search stopped early; results may be incomplete."
2. When `analyticsTotal` and `searchResultCount` both exist and differ, show:
   - "42 records match; answer cites 8 examples."

### Files

| File | Change |
|------|--------|
| `libs/shared-types/src/index.ts` | Add `assistantRunMetaSchema`, optional on response |
| `libs/api-client/src/index.ts` | Re-export types if needed |
| `apps/backend/src/assistant/local-assistant.orchestrator.ts` | Build `runMeta` in `finalize()` |
| `apps/backend/src/assistant/assistant.types.ts` | Thread truncation flags from registry |
| `apps/backend/src/assistant/assistant-tool-registry.ts` | Expose `sourcesTruncated` / `evidenceTruncated` on trace |
| `apps/flux/src/app/dashboard/ask/ask-assistant.tsx` | `RunStatusBanner` component |

### Acceptance criteria

- [ ] Every non-`answered` stop reason shows user-visible explanation.
- [ ] User can tell when displayed sources are a subset of matched records.
- [ ] Banner does not duplicate the full answer; one line + optional detail link.

### Effort

**M** — 2–3 days

---

## Upgrade 3: Structured recovery actions (not just free-text follow-ups)

### Problem

`suggestedQuestions` re-submits natural language; the model may repeat the same wrong tool
or filters. Recovery should **bias toward better tool args** or explicit next capabilities.

### Solution

Add **`suggestedActions`** — structured buttons the UI renders; each action maps to a
user-visible label and a **prefilled follow-up message** (v1) or **tool hint** (v2).

### Maps to existing fields

- **Keeps:** `suggestedQuestions` for exploratory prompts
- **Adds:** `suggestedActions: AssistantSuggestedAction[]`

### Proposed schema extension

```ts
export const assistantSuggestedActionSchema = z.object({
  id: z.string(),
  label: z.string(),           // button text
  message: z.string(),         // sent as next user message (v1)
  intent: z.enum([
    'broaden_search',
    'add_kb_check',
    'drill_down',
    'narrow_time',
    'view_details',
  ]).optional(),
});
```

### Backend logic (`suggestFollowups` → split into two functions)

Derive from `stopReason`, `toolCalls`, `sources`, `runMeta`:

| Condition | Action example |
|-----------|----------------|
| `searchFeedback` with `limit: 8` and high `sourceCount` | "Show more examples" → message with broader wording |
| Feedback sources but no `searchKnowledge` on coverage-like question | "Check knowledge base" → prefilled comparison prompt |
| `no_evidence` + had filters | "Broaden date range" / "Remove status filter" |
| Ticket sources with `shortId` in data | "Open top ticket details" → `getFeedbackDetails` style prompt with ID |
| `step_limit` | "Continue with narrower question" |

Implement in `apps/backend/src/assistant/suggest-actions.ts` (new), called from `finalize()`.

### Frontend

1. Render `suggestedActions` as primary buttons (lime outline).
2. Keep `suggestedQuestions` as secondary ghost chips below.
3. On click: `submit(action.message)` — same as today but curated.

### Files

| File | Change |
|------|--------|
| `libs/shared-types/src/index.ts` | `assistantSuggestedActionSchema` |
| `apps/backend/src/assistant/suggest-actions.ts` | New deterministic action builder |
| `apps/backend/src/assistant/local-assistant.orchestrator.ts` | Return `suggestedActions` |
| `apps/backend/src/assistant/local-assistant.orchestrator.spec.ts` | Cases per stopReason |
| `apps/flux/src/app/dashboard/ask/ask-assistant.tsx` | Action buttons UI |

### Acceptance criteria

- [ ] At least 3 deterministic action rules shipped (e.g. KB check, broaden time, drill down).
- [ ] Actions never suggest write/mutation operations.
- [ ] Empty array when `read_only_refusal` / `not_configured`.

### Effort

**M** — 2–4 days

---

## Upgrade 4: Structured result widgets (analytics + ticket list)

### Problem

`analyzeFeedback` returns rich `data` (totals, grouped rows), but only a JSON **excerpt**
on an `analytics` source. The LLM restates numbers in prose; users cannot scan or compare
visually. Search results are prose + 8 cards, not a scannable table.

### Solution

Add **`resultViews`** to the response: small, typed UI payloads the frontend renders
directly. The model still writes narrative; widgets show **canonical numbers and rows**.

### Maps to existing fields

- **Source of truth:** tool results inside registry trace (today not exposed on API)
- **New:** `resultViews: AssistantResultView[]`

### Proposed schema extension

```ts
export const assistantAnalyticsViewSchema = z.object({
  kind: z.literal('analytics'),
  total: z.number().int().min(0),
  groupBy: z.array(z.string()),
  rows: z.array(z.object({
    group1: z.string(),
    group2: z.string().optional(),
    count: z.number().int().min(0),
  })),
  filters: z.record(z.unknown()).optional(),
});

export const assistantTicketListViewSchema = z.object({
  kind: z.literal('ticket_list'),
  tickets: z.array(z.object({
    id: z.string(),
    shortId: z.string(),
    status: z.string().optional(),
    category: z.string().nullable().optional(),
    excerpt: z.string().optional(),
    href: z.string().optional(),
    citationKey: z.string().optional(),
  })),
  truncated: z.boolean(),
});

export const assistantResultViewSchema = z.discriminatedUnion('kind', [
  assistantAnalyticsViewSchema,
  assistantTicketListViewSchema,
]);
```

### Backend

1. In `AssistantToolRegistry.execute()`, append to `trace.resultViews` when:
   - `analyzeFeedback` completes → `analytics` view from `data`
   - `searchFeedback` completes → `ticket_list` from sources (cap 12 rows)
2. Expose `resultViews` on `AssistantRunTrace` and copy into `AssistantQueryResponse` in
   `finalize()`.
3. Do **not** send full ticket bodies — reuse bounded fields already on sources.

### Frontend

1. `AnalyticsResultCard` — horizontal bar or simple table from `rows`, total in header.
2. `TicketListResult` — compact table with status pills, link to `href`, citation key.
3. Insert **above** markdown answer when `resultViews.length > 0` (lead with data, then narrative).

### Files

| File | Change |
|------|--------|
| `libs/shared-types/src/index.ts` | Result view schemas |
| `apps/backend/src/assistant/assistant.types.ts` | `resultViews` on trace |
| `apps/backend/src/assistant/assistant-tool-registry.ts` | Emit views on tool complete |
| `apps/backend/src/assistant/local-assistant.orchestrator.ts` | Pass through in response |
| `apps/flux/src/app/dashboard/ask/result-views/` | New components |
| `apps/flux/src/app/dashboard/ask/ask-assistant.tsx` | Render views in transcript |

### Acceptance criteria

- [ ] Analytics questions show chart/table without requiring user to open Trace.
- [ ] Ticket search shows scannable list; citations in answer align with list keys.
- [ ] Views respect same bounds as sources (no PII expansion beyond tool output).

### Effort

**L** — 4–6 days

---

## Upgrade 5: Live run progress (steps surfaced during pending)

### Problem

While `mutation.isPending`, UI shows static "Reading Triage data…". Users have no sense of
which tools ran, whether the run is stuck, or if budget was hit. `steps` and `toolCalls` exist
only **after** the HTTP response completes.

### Solution

**Phase A (no streaming):** Staged pending copy + post-hoc step timeline.  
**Phase B (production):** SSE or WebSocket stream of step events; Flux updates incrementally.

### Maps to existing fields

- **Post-hoc:** `steps[]`, `toolCalls[]`, `durationMs`
- **Streaming (new):** `AssistantStepEvent` events mirroring `assistantStepTraceSchema`

### Phase A — quick win (no API change)

1. Replace static pending text with rotating messages based on elapsed time (0–3s, 3–10s, 10s+).
2. After success, add **"Timeline"** panel from `steps`:
   - Step number, `durationMs`, `finishReason`, tool names, new `sourceIds` count
3. Show total `durationMs` in evidence footer.

### Phase B — streaming API

#### New endpoint

```
POST /assistant/query/stream   (or Accept: text/event-stream on existing route)
```

Events:

```ts
type AssistantStreamEvent =
  | { type: 'run_started'; runId: string }
  | { type: 'tool_call_started'; step: number; name: string }
  | { type: 'tool_call_finished'; step: number; name: string; status: string; sourceCount: number }
  | { type: 'step_finished'; step: AssistantStepTrace }
  | { type: 'run_finished'; response: AssistantQueryResponse };
```

#### Backend

1. Refactor `LocalAssistantOrchestrator.run()` to accept optional `onEvent` callback.
2. Invoke from `AssistantToolRegistry.execute()` (tool start/end) and existing `onStepFinish`.
3. `AssistantController` — NestJS `@Sse()` or manual `text/event-stream` writer.

#### Frontend

1. `useAssistantStream()` hook — EventSource or fetch reader.
2. Pending transcript shows live tool list (checkmarks as tools complete).
3. Final event replaces pending bubble with full answer + evidence.

### Files

| Phase | Files |
|-------|--------|
| A | `apps/flux/src/app/dashboard/ask/ask-assistant.tsx` only |
| B | `assistant.controller.ts`, `assistant.service.ts`, `local-assistant.orchestrator.ts`, `assistant-tool-registry.ts`, `ask-assistant.tsx`, `libs/api-client` |

### Acceptance criteria

- [ ] **Phase A:** Step timeline visible for completed runs; pending state feels responsive.
- [ ] **Phase B:** User sees tool names appear in order during run; disconnect handled gracefully.
- [ ] Stream auth matches `SessionGuard` + roles.

### Effort

- **Phase A:** **S** — 0.5–1 day  
- **Phase B:** **L** — 5–8 days

---

## Recommended delivery order

```text
1. Query transparency     (S, no schema change, immediate trust win)
2. Completeness signals   (M, runMeta + banner)
3. Recovery actions       (M, suggestedActions)
4. Structured widgets     (L, resultViews)
5. Live progress          (A then B)
```

Dependencies:

- Upgrade 3 benefits from Upgrade 2 (`runMeta` makes better action rules).
- Upgrade 4 is independent but pairs well with Upgrade 2 (show total vs displayed).
- Upgrade 5 Phase B is easiest after orchestrator exposes `onEvent` for Upgrade 2 meta anyway.

---

## Explicitly out of scope (later milestones)

Aligned with `docs/agentic-rag-learning-and-implementation-plan.md`:

| Item | Milestone |
|------|-----------|
| Query rewriting on weak retrieval | M2 retrieval |
| `compareCoverage` composite tool | New tool + eval cases |
| Write workflows (draft issue, approve) | M4 persisted workflows |
| LLM semantic grounding judge | M1 eval |
| Role-based row-level tool permissions | Security hardening |
| Pin/save insight to dashboard | Product feature |

---

## Testing plan

### Backend unit tests

- `suggest-actions.ts` — matrix of stopReason × toolCalls → expected actions
- `format-tool-input` (if backend) — enum labels
- `finalize()` — `runMeta` population, truncation flags
- Registry — `resultViews` emitted for analyze + search

### Frontend

- Storybook or Vitest for `AnalyticsResultCard`, `RunStatusBanner`, formatter chips
- Manual: coverage question → verify KB recovery action appears when only feedback searched

### Regression

- Existing `assistant-eval-cases.ts` must still pass (response shape backward compatible:
  new fields optional with defaults `[]` or omitted)

---

## Verification commands

```bash
pnpm exec tsc -p apps/backend/tsconfig.app.json --noEmit
pnpm exec tsc -p apps/flux/tsconfig.json --noEmit
pnpm nx test backend --runInBand
```

---

## Summary

| # | Upgrade | Key fields | Schema change? |
|---|---------|------------|----------------|
| 1 | Query transparency | `toolCalls`, `steps` | No |
| 2 | Completeness signals | `stopReason`, `sources`, + `runMeta` | Yes (optional) |
| 3 | Recovery actions | `suggestedQuestions`, + `suggestedActions` | Yes |
| 4 | Structured widgets | `sources`, + `resultViews` | Yes |
| 5 | Live progress | `steps`, `toolCalls`, stream events | Phase B only |

Together, these turn `AssistantQueryResponse` from an **agent debug payload** into a
**product surface**: users see what was searched, how complete the answer is, what to try next,
canonical data widgets, and (eventually) live progress — without replacing the read-only tool
architecture underneath.
