import type { Socket } from 'socket.io';
import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  it('handleJoinStaff joins staff room', () => {
    const gateway = new EventsGateway();
    const join = jest.fn().mockResolvedValue(undefined);
    const client = { join } as unknown as Socket;
    expect(gateway.handleJoinStaff(client)).toEqual({ ok: true });
    expect(join).toHaveBeenCalledWith('staff');
  });

  it('emitFeedbackEvent emits to staff', () => {
    const gateway = new EventsGateway();
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gateway.server = { to } as never;
    gateway.emitFeedbackEvent({ type: 'updated', feedbackId: 'f1' });
    expect(to).toHaveBeenCalledWith('staff');
    expect(emit).toHaveBeenCalledWith('feedback', {
      type: 'updated',
      feedbackId: 'f1',
    });
  });

  it('emitFeedbackEvent is safe when server not yet bound', () => {
    const gateway = new EventsGateway();
    gateway.server = undefined as never;
    expect(() =>
      gateway.emitFeedbackEvent({ type: 'updated', feedbackId: 'f1' }),
    ).not.toThrow();
  });

  it('afterInit runs without throwing', () => {
    const gateway = new EventsGateway();
    expect(() => gateway.afterInit()).not.toThrow();
  });
});
