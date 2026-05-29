# Changelog

All notable changes to Triage will be documented in this file.

This project follows semantic versioning after the first public release. Until
then, entries are grouped under `Unreleased`.

## Unreleased

No unreleased changes yet.

## v0.1.0-alpha.1 - 2026-05-29

Initial public developer preview.

### Added

- Self-hosted feedback intake with dashboard, widget, backend API, worker,
  Postgres, Redis, and S3-compatible attachment storage.
- AI-assisted feedback triage with fallback behavior when model credentials are
  not configured.
- Metadata-based escalation tiers, Kanban/table queue views, ticket drawers,
  claim/resolve/reject workflows, and Linear/Jira handoff.
- Widget configuration for branding, fields, file attachments, targeting,
  consent, trigger behavior, variants, and inline embeds.
- Knowledge-base article management, import flow, and deflection support.
- Public marketing site redesign for the open-source release.
- Demo seed data for a first-run workspace, widget, KB article, and feedback
  queue.
- GitHub community files, issue templates, Dependabot, CI, deployment docs,
  security policy, and contributing guide.

### Known Limits

- This is an alpha/developer-preview release, not a hardened production support
  platform.
- Full backend unit coverage still needs cleanup before the complete test suite
  can be enforced in CI.
- Captcha/Turnstile, encrypted widget secret storage, retention automation,
  deeper observability, and public status links remain roadmap items.
