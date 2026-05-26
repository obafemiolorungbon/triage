# Security Policy

## Reporting A Vulnerability

Please report suspected vulnerabilities privately before opening a public issue.
If this repository is hosted on GitHub, use GitHub private vulnerability
reporting when it is enabled. Otherwise contact the maintainers through the
published project contact channel.

Include:

- Affected component and version or commit SHA.
- Reproduction steps.
- Expected impact.
- Any logs, screenshots, or proof-of-concept code needed to verify the issue.

Do not include live production credentials, customer data, or destructive
payloads in the report.

## Supported Versions

The open-source project currently supports the latest `main` branch. Security
fixes should be applied there first unless a maintained release branch exists.

## What Not To Report

Please do not report placeholder values from `.env.example`, demo credentials
created in a local environment, or intentionally empty environment variables as
leaked secrets.

If a real API key, webhook URL, token, or private endpoint is ever committed,
rotate it immediately and remove it from Git history before making the
repository public.

## Operator Responsibilities

Self-hosted operators are responsible for:

- Setting strong `BETTER_AUTH_SECRET` and provider credentials.
- Running Postgres with pgvector, Redis, and S3-compatible storage securely.
- Configuring widget allowed origins before using widgets in production.
- Rotating Linear, Jira, OpenRouter, Resend, S3, and Redis credentials if they
  may have been exposed.
- Keeping deployment images and dependencies patched.
