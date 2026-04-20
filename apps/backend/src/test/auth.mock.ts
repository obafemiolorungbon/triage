import type { ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from '../guards/session.guard';

export function mockHttpExecutionContext(
  req: Partial<AuthedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req as AuthedRequest,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}
