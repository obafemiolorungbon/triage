import { AppService } from './app.service';

describe('AppService', () => {
  it('getData', () => {
    expect(new AppService().getData()).toEqual({ message: 'Hello API' });
  });
});
