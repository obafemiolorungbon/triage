jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { generateObject } from 'ai';
import { AiService } from './ai.service';
import type { Env } from '../config/env.schema';

const mockedGenerateObject = generateObject as jest.MockedFunction<
  typeof generateObject
>;

describe('AiService', () => {
  const mkConfig = (over: Partial<Record<keyof Env, string | number>> = {}) => {
    const env: Record<string, string | number> = {
      OPENROUTER_API_KEY: 'sk-test',
      OPENROUTER_MODEL_FILTER: 'filter-model',
      OPENROUTER_MODEL_MAIN: 'main-model',
      OPENROUTER_INDUSTRY_CONTEXT: '',
      ...over,
    };
    return {
      get: (key: keyof Env) => env[key as string] as never,
    } as ConfigService<Env, true>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGenerateObject.mockResolvedValue({
      object: { isNoise: false, reason: 'ok' },
    } as never);
  });

  it('isEnabled is false without API key', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: mkConfig({ OPENROUTER_API_KEY: '' }),
        },
      ],
    }).compile();
    const svc = moduleRef.get(AiService);
    expect(svc.isEnabled()).toBe(false);
  });

  it('isEnabled is true with API key', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mkConfig() },
      ],
    }).compile();
    expect(moduleRef.get(AiService).isEnabled()).toBe(true);
  });

  it('classifySpam returns object from generateObject', async () => {
    mockedGenerateObject.mockResolvedValueOnce({
      object: { isNoise: true, reason: 'spam' },
    } as never);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mkConfig() },
      ],
    }).compile();
    const svc = moduleRef.get(AiService);
    await expect(svc.classifySpam('text')).resolves.toEqual({
      isNoise: true,
      reason: 'spam',
    });
    expect(mockedGenerateObject).toHaveBeenCalled();
  });

  it('retries classifySpam once then succeeds', async () => {
    mockedGenerateObject
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({
        object: { isNoise: false, reason: 'ok' },
      } as never);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mkConfig() },
      ],
    }).compile();
    const svc = moduleRef.get(AiService);
    await expect(svc.classifySpam('x')).resolves.toEqual({
      isNoise: false,
      reason: 'ok',
    });
    expect(mockedGenerateObject).toHaveBeenCalledTimes(2);
  });

  it('classifySpam rethrows after retries exhausted', async () => {
    mockedGenerateObject.mockRejectedValue(new Error('fail'));
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mkConfig() },
      ],
    }).compile();
    await expect(moduleRef.get(AiService).classifySpam('x')).rejects.toThrow(
      'fail',
    );
    expect(mockedGenerateObject).toHaveBeenCalledTimes(2);
  });

  it('exposes model names from config', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mkConfig() },
      ],
    }).compile();
    const svc = moduleRef.get(AiService);
    expect(svc.getMainModelName()).toBe('main-model');
    expect(svc.getFilterModelName()).toBe('filter-model');
  });

  it('getIndustryContext returns empty string when unset', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: mkConfig({ OPENROUTER_INDUSTRY_CONTEXT: '' }),
        },
      ],
    }).compile();
    expect(moduleRef.get(AiService).getIndustryContext()).toBe('');
  });

  it('triageTicket uses config industry when opts omitted', async () => {
    mockedGenerateObject.mockResolvedValueOnce({
      object: {
        cleanedText: 'c',
        category: 'other',
        priority: 'low',
        sentiment: 'neutral',
        knowledgeGap: false,
        suggestedTags: [],
      },
    } as never);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: mkConfig({ OPENROUTER_INDUSTRY_CONTEXT: 'retail' }),
        },
      ],
    }).compile();
    await moduleRef.get(AiService).triageTicket('body');
    const call = mockedGenerateObject.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain('retail');
  });

  it('triageTicket uses industry from opts', async () => {
    mockedGenerateObject.mockResolvedValueOnce({
      object: {
        cleanedText: 'c',
        category: 'bug',
        priority: 'low',
        sentiment: 'neutral',
        knowledgeGap: false,
        suggestedTags: [],
      },
    } as never);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mkConfig() },
      ],
    }).compile();
    const svc = moduleRef.get(AiService);
    await svc.triageTicket('body', { industryContext: 'fintech' });
    const call = mockedGenerateObject.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain('fintech');
  });
});
