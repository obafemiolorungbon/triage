import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthedRequest } from '../guards/session.guard';

/**
 * Test double: allows all routes; attaches a fake session on non-@Public handlers.
 */
@Injectable()
export class TestSessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!isPublic) {
      req.session = {
        user: { id: 'test-user-id', role: 'admin' },
      } as AuthedRequest['session'];
    }
    return true;
  }
}
