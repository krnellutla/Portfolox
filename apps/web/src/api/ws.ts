import { env } from '../config/env.js';
import { getAccessToken } from './client.js';
import { queryClient, qk } from '../lib/query-client.js';
import type { Message } from '@portfoliohub/shared';

type WsEvent =
  | { type: 'message.created'; data: Message }
  | { type: 'presence'; data: { userId: string; online: boolean } }
  | { type: 'typing'; data: { conversationId: string; userId: string } };

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const maxDelay = 30_000;

function getWsUrl(): string {
  const base = env.VITE_API_BASE_URL.replace(/^http/, 'ws');
  const token = getAccessToken();
  return token ? `${base}/ws?token=${encodeURIComponent(token)}` : `${base}/ws`;
}

function onMessage(raw: MessageEvent) {
  let event: WsEvent;
  try {
    event = JSON.parse(raw.data as string) as WsEvent;
  } catch {
    return;
  }

  if (event.type === 'message.created') {
    const msg = event.data;
    queryClient.setQueryData(
      qk.conversationMessages(msg.conversationId),
      (old: { items: Message[]; nextCursor: string | null } | undefined) => {
        if (!old) return old;
        const exists = old.items.some((m) => m.id === msg.id);
        if (exists) return old;
        return { ...old, items: [...old.items, msg] };
      },
    );
    void queryClient.invalidateQueries({ queryKey: qk.conversations() });
  }
}

export function connectWs() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(getWsUrl());

  socket.addEventListener('open', () => {
    reconnectDelay = 1000;
  });

  socket.addEventListener('message', onMessage);

  socket.addEventListener('close', () => {
    socket = null;
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
      connectWs();
    }, reconnectDelay);
  });

  socket.addEventListener('error', () => {
    socket?.close();
  });
}

export function disconnectWs() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}

export function sendWsMessage(conversationId: string, body: string) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'message.send', conversationId, body }));
  }
}
