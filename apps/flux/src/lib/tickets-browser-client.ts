'use client';

import { createApiClient } from '@triage/api-client';
import { getPublicApiBase } from './api-base';

export function browserTicketsClient() {
  return createApiClient({ baseUrl: getPublicApiBase() });
}
