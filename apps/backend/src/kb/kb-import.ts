import TurndownService from 'turndown';
import type { KbImportProvider } from '@triage/shared-types';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

export type NormalizedKbImportArticle = {
  index: number;
  provider: KbImportProvider;
  title: string;
  slug: string;
  body: string;
  published: boolean;
  sourceId?: string;
  sourceUrl?: string;
  sourceLocale?: string;
  sourceUpdatedAt?: Date;
  sourcePath?: string;
};

export type KbImportRowError = {
  index: number;
  error: string;
};

export type KbImportNormalization = {
  total: number;
  articles: NormalizedKbImportArticle[];
  errors: KbImportRowError[];
};

type JsonRecord = Record<string, unknown>;

export function normalizeKbImport(
  provider: KbImportProvider,
  payload: unknown,
): KbImportNormalization {
  const parsedPayload = parsePayload(payload);
  const rows = extractRows(provider, parsedPayload);
  const articles: NormalizedKbImportArticle[] = [];
  const errors: KbImportRowError[] = [];

  rows.forEach((row, index) => {
    const normalized = normalizeRow(provider, row, index);
    if ('error' in normalized) {
      errors.push(normalized);
    } else {
      articles.push(normalized);
    }
  });

  return { total: rows.length, articles, errors };
}

export function slugifyKbTitle(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/g, '');
  return slug || 'imported-article';
}

function parsePayload(payload: unknown) {
  if (typeof payload !== 'string') return payload;
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return payload;
  }
}

function extractRows(provider: KbImportProvider, payload: unknown) {
  const obj = asRecord(payload);
  if (Array.isArray(payload)) return payload;
  if (obj && Array.isArray(obj.articles)) return obj.articles;
  if (provider === 'intercom' && obj && Array.isArray(obj.data)) return obj.data;
  return [];
}

function normalizeRow(
  provider: KbImportProvider,
  row: unknown,
  index: number,
): NormalizedKbImportArticle | KbImportRowError {
  const obj = asRecord(row);
  if (!obj) return { index, error: 'Row is not an object' };

  const title = readString(obj.title).trim();
  if (!title) return { index, error: 'Missing title' };

  const html = readProviderHtml(provider, obj);
  const body = htmlToMarkdown(html);
  if (body.length < 20) return { index, error: 'Body is missing or too short' };

  return {
    index,
    provider,
    title: title.slice(0, 220),
    slug: slugifyKbTitle(title),
    body,
    published: readPublished(provider, obj),
    sourceId: readSourceId(obj),
    sourceUrl: readSourceUrl(provider, obj),
    sourceLocale: readSourceLocale(provider, obj),
    sourceUpdatedAt: readDate(provider === 'intercom' ? obj.updated_at : obj.updated_at),
    sourcePath: readSourcePath(provider, obj),
  };
}

function readProviderHtml(provider: KbImportProvider, obj: JsonRecord) {
  if (provider === 'freshdesk') {
    return readString(obj.description) || readString(obj.description_text);
  }
  return readString(obj.body);
}

function htmlToMarkdown(value: string) {
  const markdown = turndown
    .turndown(value || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return markdown;
}

function readPublished(provider: KbImportProvider, obj: JsonRecord) {
  if (provider === 'zendesk') return obj.draft !== true;
  if (provider === 'intercom') return obj.state === 'published';
  if (provider === 'freshdesk') return obj.status === 2;
  return false;
}

function readSourceId(obj: JsonRecord) {
  const value = obj.id;
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function readSourceUrl(provider: KbImportProvider, obj: JsonRecord) {
  if (provider === 'zendesk') {
    return readString(obj.html_url) || readString(obj.url);
  }
  return readString(obj.url) || undefined;
}

function readSourceLocale(provider: KbImportProvider, obj: JsonRecord) {
  if (provider === 'zendesk') return readString(obj.locale) || undefined;
  if (provider === 'intercom') return readString(obj.default_locale) || undefined;
  if (provider === 'freshdesk') {
    const hierarchy = Array.isArray(obj.hierarchy) ? obj.hierarchy : [];
    for (const item of hierarchy) {
      const data = asRecord(asRecord(item)?.data);
      const language = data ? readString(data.language) : '';
      if (language) return language;
    }
  }
  return undefined;
}

function readSourcePath(provider: KbImportProvider, obj: JsonRecord) {
  if (provider === 'freshdesk') {
    const parts = (Array.isArray(obj.hierarchy) ? obj.hierarchy : [])
      .map((item) => readString(asRecord(asRecord(item)?.data)?.name).trim())
      .filter(Boolean);
    return parts.length ? parts.join(' / ') : undefined;
  }

  if (provider === 'intercom') {
    const ids = Array.isArray(obj.parent_ids)
      ? obj.parent_ids.map(String).filter(Boolean)
      : [];
    if (ids.length) return ids.join(' / ');
    const parentType = readString(obj.parent_type);
    const parentId = readString(obj.parent_id);
    if (parentType && parentId) return `${parentType}:${parentId}`;
  }

  if (provider === 'zendesk') {
    const sectionId = obj.section_id;
    if (typeof sectionId === 'string' || typeof sectionId === 'number') {
      return `section:${sectionId}`;
    }
  }

  return undefined;
}

function readDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function readString(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}
