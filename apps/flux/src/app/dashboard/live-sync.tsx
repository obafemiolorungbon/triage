'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { getPublicApiBase } from '../../lib/api-base';

/** Best-effort live refresh when WebSocket can reach the API (same-site / proxied). */
export function LiveSync() {
  const router = useRouter();

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
      socket.on('feedback', () => router.refresh());
    } catch {
      /* ignore */
    }
    return () => {
      socket?.disconnect();
    };
  }, [router]);

  return null;
}
