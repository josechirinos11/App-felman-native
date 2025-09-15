import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config/constants';

type UseSocketOptions = {
  path?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
};

export function useSocket(url?: string, opts?: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connect = useCallback(() => {
    const finalUrl = String(url || WS_URL || '').trim();
    if (!finalUrl) return null;

    try {
      // For RN + web: force websocket transport to avoid polling issues
      const socket = io(finalUrl, {
        transports: ['websocket'],
        path: opts?.path,
        autoConnect: opts?.autoConnect ?? true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        opts?.onConnect && opts.onConnect();
      });

      socket.on('disconnect', (reason: string) => {
        setConnected(false);
        opts?.onDisconnect && opts.onDisconnect(reason);
      });

      // Generic message handler for demo
      socket.on('message', (payload: any) => {
        setLastMessage(payload);
      });

      // Optional: listen a generic 'update' event used by some backends
      socket.on('update', (payload: any) => {
        setLastMessage(payload);
      });

      return socket;
    } catch (e) {
      console.warn('[useSocket] Error inicializando socket:', e);
      return null;
    }
  }, [url, opts]);

  useEffect(() => {
    const s = connect();

    return () => {
      try {
        s?.off && s.off();
        s?.disconnect && s.disconnect();
      } catch (e) {
        // noop
      }
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect]);

  const send = useCallback((event: string, payload?: any) => {
    if (!socketRef.current) return false;
    socketRef.current.emit(event, payload);
    return true;
  }, []);

  return {
    socket: socketRef.current,
    connected,
    lastMessage,
    send,
  } as const;
}

export default useSocket;
