jest.mock('../auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { auth } from '../auth';
import { SessionGuard } from './session.guard';
import { mockHttpExecutionContext } from '../test/auth.mock';

const getSession = auth.api.getSession as jest.MockedFunction<
  typeof auth.api.getSession
>;

describe('SessionGuard', () => {
  let guard: SessionGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [SessionGuard, Reflector],
    }).compile();
    guard = moduleRef.get(SessionGuard);
  });

  it('allows @Public routes without session', async () => {
    const ctx = mockHttpExecutionContext({ headers: {} });
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockImplementation(
      (key: string) => {
        if (key === 'isPublic') return true;
        return undefined;
      },
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('throws when no session', async () => {
    getSession.mockResolvedValue(null);
    const ctx = mockHttpExecutionContext({ headers: {} });
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockImplementation(
      (key: string) => {
        if (key === 'isPublic') return false;
        if (key === 'roles') return undefined;
        return undefined;
      },
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches session and allows when role matches', async () => {
    getSession.mockResolvedValue({
      user: { id: '1', role: 'admin' },
    } as never);
    const req = { headers: {} } as never;
    const ctx = mockHttpExecutionContext(req);
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockImplementation(
      (key: string) => {
        if (key === 'isPublic') return false;
        if (key === 'roles') return ['admin'];
        return undefined;
      },
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((req as { session?: unknown }).session).toBeDefined();
  });

  it('throws when role insufficient', async () => {
    getSession.mockResolvedValue({
      user: { id: '1', role: 'agent' },
    } as never);
    const ctx = mockHttpExecutionContext({ headers: {} });
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockImplementation(
      (key: string) => {
        if (key === 'isPublic') return false;
        if (key === 'roles') return ['admin'];
        return undefined;
      },
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows when roles metadata is an empty array', async () => {
    getSession.mockResolvedValue({
      user: { id: '1', role: 'agent' },
    } as never);
    const ctx = mockHttpExecutionContext({ headers: {} });
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockImplementation(
      (key: string) => {
        if (key === 'isPublic') return false;
        if (key === 'roles') return [];
        return undefined;
      },
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('defaults missing user.role to agent for role check', async () => {
    getSession.mockResolvedValue({
      user: { id: '1' },
    } as never);
    const ctx = mockHttpExecutionContext({ headers: {} });
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockImplementation(
      (key: string) => {
        if (key === 'isPublic') return false;
        if (key === 'roles') return ['agent'];
        return undefined;
      },
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
