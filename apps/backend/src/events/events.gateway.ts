import { Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';
import { getCorsOrigins } from '../config/cors-origins';

@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayInit {
  private readonly log = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  afterInit() {
    this.log.log('WebSocket /events gateway initialized');
  }

  @SubscribeMessage('joinStaff')
  handleJoinStaff(client: Socket) {
    void client.join('staff');
    return { ok: true };
  }

  emitFeedbackEvent(payload: { type: string; feedbackId: string }) {
    this.server?.to('staff').emit('feedback', payload);
  }
}
