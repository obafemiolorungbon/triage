# AI journey (Smart Triage)

This document summarizes how AI coding assistants were used on this repository, per assessment expectations.

## 1. Three substantive prompts

**A. Route alignment and status model**

We asked to rename the public HTTP surface from `/feedback` to assessment-style `/tickets`, add `PATCH /tickets/:id` for status changes, and accept ticket intake shaped as `customer_email`, `description`, and optional `title` while still storing the existing Prisma `Feedback` row (mapping title + description into `rawText`). The assistant proposed a single `TicketsController`, Zod schemas in `libs/shared-types`, and a centralized `updateStatus` method that reuses the old claim/resolve rules for `claimed` and `resolved` while enforcing a smaller transition matrix for other statuses.

**B. React Query + Kanban cache strategy**

We asked to replace ad hoc `fetch` / `useEffect` data loading with TanStack Query and to add a Kanban view with drag-and-drop. The assistant structured a stable `QueryClientProvider` at the app root, list queries keyed by the full list query string (including filters and `pageSize` for Kanban), `useMutation` for `PATCH` with `onMutate` optimistic updates on the list cache, and `invalidateQueries` from the WebSocket `LiveSync` component so realtime events stay coherent with the client cache.

**C. @dnd-kit column board**

We asked for `@dnd-kit/core` + `@dnd-kit/sortable` with daisyUI-styled columns. The assistant modeled each workflow column as a `useDroppable` with id `col:${status}`, cards as `useSortable` by ticket id, `closestCorners` collision detection, and drop resolution that maps `over.id` to either a column id or a peer card’s status so drops on cards behave like drops on that column.

## 2. One bad suggestion and how it was corrected

**Issue:** An earlier iteration introduced a separate `libs/ai-triage` package and mixed **Zod 4** (pulled in by newer `better-auth` / `better-call` peers) with **Vercel AI SDK / `@ai-sdk/*`**, which at the time expected **Zod 3**. Typecheck and installs failed with peer dependency conflicts, and generated code sometimes imported the wrong `z` instance for `generateObject` schemas.

**Fix:** We pinned **Zod 3.25.x** via `pnpm.overrides`, removed the standalone `ai-triage` library, and inlined the OpenRouter + `generateObject` pipeline in `apps/backend/src/triage/triage-llm.ts` next to the worker, keeping a small schema-focused spec file for regression signal. That restored a single Zod major across the monorepo and simplified the worker bundle.

## 3. How we stayed “architect in the loop”

- Reviewed every public route and DTO against the written brief (paths vs internal domain naming).
- Chose **session-based Better Auth** over JWT deliberately and kept middleware `fetch` for `get-session` (edge-appropriate, not forced into React Query).
- Kept **BullMQ** triage asynchronous instead of blocking `POST /tickets`, and documented that as an intentional product decision rather than blindly matching “call LLM in request” wording.
