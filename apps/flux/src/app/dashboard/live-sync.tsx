'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getPublicApiBase } from '../../lib/api-base';

export function LiveSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_WS !== 'true') return;
    const api = getPublicApiBase();
    let socket: Socket | undefined;
    try {
      socket = io(`${api}/events`, {
        transports: ['websocket'],
        withCredentials: true,
      });
      socket.emit('joinStaff');
      socket.on('feedback', () => {
        void queryClient.invalidateQueries({ queryKey: ['tickets'] });
        void queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
        void queryClient.invalidateQueries({ queryKey: ['ticket'] });
      });
    } catch {
      /* ignore */
    }
    return () => {
      socket?.disconnect();
    };
  }, [queryClient]);

  return null;
}
