import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DigestService } from './digest.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import type { Env } from '../config/env.schema';

describe('DigestService', () => {
  it('returns early in test NODE_ENV', async () => {
    const prisma = {
      client: { user: { findMany: jest.fn() }, feedback: { count: jest.fn() } },
    } as unknown as PrismaService;
    const mail = { sendPlain: jest.fn() };
    const config = {
      get: (k: keyof Env) => (k === 'NODE_ENV' ? 'test' : 'development'),
    } as ConfigService<Env, true>;
    const moduleRef = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: mail },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    await moduleRef.get(DigestService).dailyDigest();
    expect(prisma.client.user.findMany).not.toHaveBeenCalled();
    expect(mail.sendPlain).not.toHaveBeenCalled();
  });

  it('does not send when there are no staff users', async () => {
    const prisma = {
      client: {
        user: { findMany: jest.fn().mockResolvedValue([]) },
        feedback: { count: jest.fn().mockResolvedValue(2) },
      },
    } as unknown as PrismaService;
    const mail = { sendPlain: jest.fn() };
    const config = {
      get: (k: keyof Env) => (k === 'NODE_ENV' ? 'development' : ''),
    } as ConfigService<Env, true>;
    const moduleRef = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: mail },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    await moduleRef.get(DigestService).dailyDigest();
    expect(mail.sendPlain).not.toHaveBeenCalled();
  });

  it('sends digest emails when NODE_ENV is production', async () => {
    const prisma = {
      client: {
        user: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ email: 'p@p.com', name: 'P' }]),
        },
        feedback: { count: jest.fn().mockResolvedValue(1) },
      },
    } as unknown as PrismaService;
    const mail = { sendPlain: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: (k: keyof Env) => (k === 'NODE_ENV' ? 'production' : ''),
    } as ConfigService<Env, true>;
    const moduleRef = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: mail },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    await moduleRef.get(DigestService).dailyDigest();
    expect(mail.sendPlain).toHaveBeenCalled();
  });

  it('sends digest emails in development', async () => {
    const prisma = {
      client: {
        user: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ email: 'a@a.com', name: 'A' }]),
        },
        feedback: { count: jest.fn().mockResolvedValue(3) },
      },
    } as unknown as PrismaService;
    const mail = { sendPlain: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: (k: keyof Env) => (k === 'NODE_ENV' ? 'development' : ''),
    } as ConfigService<Env, true>;
    const moduleRef = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: mail },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    await moduleRef.get(DigestService).dailyDigest();
    expect(mail.sendPlain).toHaveBeenCalledWith({
      to: 'a@a.com',
      subject: 'Daily triage digest',
      text: expect.stringContaining('3 open feedback'),
    });
  });
});
