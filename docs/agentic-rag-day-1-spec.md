# Agentic RAG Foundation: Implementation Guide

Date: June 15, 2026  
Status: implemented  
Scope: read-only agent loop, hybrid retrieval, indexing, grounding, and evaluation

## 1. What Was Built

Triage now has a read-only agentic RAG foundation with five capability-oriented tools:

1. `searchFeedback`
2. `getFeedbackDetails`
3. `analyzeFeedback`
4. `searchKnowledge`
5. `searchDeflections`

The assistant uses native AI SDK tool calling. A run can use at most four model steps
and six tool executions. The application owns workspace scope, actor context, time
limits, evidence limits, duplicate detection, citations, and stop reasons.

The old `findKnowledgeGaps` tool was removed. A documentation gap is now an agent
conclusion based on customer evidence from feedback or deflections and coverage
evidence from the knowledge base.

## 2. The Mental Model

Standard RAG follows one fixed path:

```text
question -> retrieve -> answer
```

This implementation uses a controlled loop:

```text
question
  -> model selects a typed read tool
  -> application validates and executes it
  -> model inspects the result
  -> model retrieves again or answers
  -> application validates citations
  -> answer or abstention
```

The model decides which declared capability to use. It does not execute code, choose a
workspace, create SQL, bypass limits, or mutate data.

## 3. Why Feedback And KB Stay Separate

Feedback and knowledge articles answer different questions:

- Feedback is evidence about what customers experienced.
- The KB is evidence about what the company has documented.

For "what are the latest transaction complaints?", only `searchFeedback` is relevant.
Searching the KB would add help content, not complaint evidence.

For "are transaction complaints covered by our documentation?", the agent should call
both `searchFeedback` and `searchKnowledge`, then compare the two result sets. They are
never merged automatically into one ranking.

## 4. Tool Responsibilities

### `searchFeedback`

Hybrid retrieval over indexed customer feedback. It supports exact and semantic
queries plus status, sentiment, category, escalation, severity, submission type,
knowledge-gap, absolute date, and relative recency filters.

Use it for examples, complaints, matching records, recent reports, and records that
need follow-up inspection.

### `getFeedbackDetails`

Hydrates one feedback record with comments, recent triage history, attachment
metadata, surveys, and external issue links.

Use it after a short ID or database ID is known. It is not a general search tool.

### `analyzeFeedback`

Runs deterministic, application-owned relational aggregation. It supports the same
feedback filters and up to two controlled groupings.

Use it for counts, distributions, comparisons, and trends. The model never generates
SQL and must not estimate totals by counting search results.

### `searchKnowledge`

Hybrid retrieval over published KB chunks in the active workspace.

Use it for documented guidance and documentation-coverage comparisons. It is not a
source of customer complaints.

### `searchDeflections`

Retrieves widget search behavior, especially submitted and abandoned searches.

Use it to identify failed self-service attempts and unmet information needs.

## 5. Retrieval Architecture

Feedback indexing creates one `FeedbackSearchDocument` per feedback record:

- composed, non-sensitive search text;
- generated PostgreSQL `tsvector`;
- optional `vector(1536)` embedding;
- content hash and embedding model;
- indexing and embedding timestamps.

Search text includes customer text, category, sentiment, severity, escalation reason,
and an allowlist of metadata. Internal comments are intentionally excluded.

Both feedback documents and KB chunks have generated `tsvector` columns and GIN
indexes. Hybrid search:

1. retrieves lexical candidates with PostgreSQL full-text search;
2. retrieves semantic candidates with pgvector;
3. fuses ranks with reciprocal-rank fusion using `k = 60`;
4. uses a candidate pool of `max(20, limit * 4)`;
5. falls back to lexical search when embedding generation fails.

Workspace and KB publication filters are applied inside each candidate query before
fusion.

## 6. Indexing Lifecycle

Triage completion enqueues `feedback-index-queue`.

The index worker first upserts lexical content. It then:

- reuses an existing embedding when content hash and model are unchanged;
- creates a new embedding when content or model changed;
- leaves lexical retrieval usable if embedding fails;
- relies on BullMQ exponential retry for transient failures.

Existing records can be indexed idempotently with:

```bash
pnpm index:feedback
```

The command continues after individual failures and reports indexed, embedded, reused,
and failed counts.

## 7. Agent Run Controls

Every run receives application-controlled context:

```ts
type AssistantRunContext = {
  runId: string;
  workspaceId: string;
  userId?: string;
  role: 'admin' | 'agent';
  startedAt: number;
  abortSignal: AbortSignal;
};
```

The fixed production budgets are:

- four model steps;
- six tool executions;
- 30 seconds;
- 16 evidence sources;
- 24,000 evidence characters.

Duplicate normalized calls are skipped. Individual tool failures are returned to the
model as structured failures, so another retrieval path can still succeed.

Write requests are rejected before model execution.

## 8. Grounding

Sources receive run-scoped keys such as `[S1]`. The model may cite only keys returned
by tools in that run.

The application:

- rejects unknown citation keys;
- does not append citations automatically;
- permits one citation-repair generation;
- abstains if the repaired answer is still not grounded;
- treats retrieved text as untrusted data, never as instructions.

The current validator proves that all cited keys exist. The optional live evaluation
judge provides the stronger semantic check that claims are actually supported.

## 9. Evaluation

The repository includes 32 evaluation cases covering:

- exact and semantic feedback retrieval;
- recent complaints and filters;
- analytics and trends;
- KB-only questions;
- feedback-versus-KB coverage;
- failed deflections;
- query rewriting;
- unsupported questions;
- prompt injection;
- write attempts.

Deterministic gates check expected and forbidden tools, citation keys, budgets,
abstention, and stop reasons. An optional correctness/grounding judge cannot override a
failed deterministic gate.

Lexical, vector, and fused recall are compared explicitly. Fusion is declared superior
only when measured fused recall beats both component modes.

## 10. Verification

Run:

```bash
pnpm exec prisma validate --schema=libs/db/prisma/schema.prisma
pnpm exec tsc -p apps/backend/tsconfig.app.json --noEmit
pnpm nx test backend --runInBand
```

The migration is:

```text
libs/db/prisma/migrations/20260615000000_agentic_rag_search
```

No frontend build is required for this backend-focused foundation.

## 11. Learning Checkpoints

After reading the implementation, you should be able to explain:

1. Why a tool schema constrains model requests but application code still owns
   authorization.
2. Why retrieval and analytics are separate capabilities.
3. Why feedback and KB rankings are not automatically merged.
4. How RRF combines ranks without comparing incompatible raw scores.
5. Why lexical indexing happens before embedding.
6. How the agent can recover from one tool failure.
7. Why valid citation syntax is necessary but not sufficient for semantic grounding.
8. Why deterministic evaluation gates take precedence over an LLM judge.

## 12. Framework Decision

AI SDK is the correct orchestration layer for this short-lived, read-only loop. It
already provides typed tools, automatic tool-result messages, multi-step generation,
and step callbacks.

LangGraph remains appropriate later for persisted, resumable workflows with human
approval, such as drafting and approving external issue creation. Adding it to this
request-response loop now would duplicate orchestration without adding required
behavior.
