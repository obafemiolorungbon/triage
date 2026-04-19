import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { auth } from '../auth';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

export type AuthedRequest = Request & {
  session?: Awaited<ReturnType<typeof auth.api.getSession>>;
};

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const session = await auth.api.getSession({
      headers: req.headers as HeadersInit,
    });
    if (!session) {
      throw new UnauthorizedException();
    }
    req.session = session;

    const roles = this.reflector.getAllAndOverride<('admin' | 'agent')[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (roles?.length) {
      const role = (session.user as { role?: string }).role ?? 'agent';
      if (!roles.includes(role as 'admin' | 'agent')) {
        throw new UnauthorizedException('Insufficient role');
      }
    }

    return true;
  }
}
