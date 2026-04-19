import { createAuthClient } from 'better-auth/react';
import { getPublicApiBase } from './api-base';

export const authClient = createAuthClient({
  baseURL: getPublicApiBase(),
  basePath: '/api/v1/auth',
});
