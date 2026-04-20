import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('returns hello payload', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    expect(moduleRef.get(AppController).getData()).toEqual({
      message: 'Hello API',
    });
  });
});
