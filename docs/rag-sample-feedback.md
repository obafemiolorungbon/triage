# RAG Sample Feedback

Populate the default workspace with 150 deterministic synthetic feedback
records:

```bash
pnpm seed:rag-feedback
```

The command:

- replaces any previous `TR-RAG-*` sample batch;
- creates varied customer identities, wording, categories, severities,
  sentiments, statuses, dates, metadata, and triage histories;
- creates lexical search documents and attempts embeddings for every record;
- leaves lexical retrieval usable when an individual embedding fails.

To create a different number of records:

```bash
pnpm seed:rag-feedback -- --count=300
```

To create database rows without indexing:

```bash
pnpm seed:rag-feedback -- --skip-index
```

Verify row counts, embeddings, exact retrieval, and semantic retrieval:

```bash
pnpm verify:rag-feedback
```

Remove only the synthetic RAG records and all cascading related data:

```bash
pnpm cleanup:rag-feedback
```

Real feedback and the original demo seed records are not matched by the
`TR-RAG-*` cleanup prefix.
