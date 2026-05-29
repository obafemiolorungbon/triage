import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public', () => {
  it('defines metadata on the method function (Nest SetMetadata + descriptor)', () => {
    class T {
      m(): void {
        return undefined;
      }
    }
    const desc = Object.getOwnPropertyDescriptor(T.prototype, 'm')!;
    Public()(T.prototype, 'm', desc);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, desc.value)).toBe(true);
  });
});
