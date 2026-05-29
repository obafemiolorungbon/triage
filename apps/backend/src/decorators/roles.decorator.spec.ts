import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles', () => {
  it('defines metadata on the method function', () => {
    class T {
      m(): void {
        return undefined;
      }
    }
    const desc = Object.getOwnPropertyDescriptor(T.prototype, 'm')!;
    Roles('admin', 'agent')(T.prototype, 'm', desc);
    expect(Reflect.getMetadata(ROLES_KEY, desc.value)).toEqual([
      'admin',
      'agent',
    ]);
  });
});
