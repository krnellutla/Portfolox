import { z } from 'zod';
import { conversationSchema, messageListSchema, messageSchema } from '@blueflutes/shared';
import { apiFetch } from './client.js';

export function listConversations() {
  return apiFetch('/conversations', {}, z.array(conversationSchema));
}

export function getMessages(id: string, cursor?: string) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetch(`/conversations/${id}/messages${qs}`, {}, messageListSchema);
}

export function sendMessage(id: string, body: string) {
  return apiFetch(
    `/conversations/${id}/messages`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) },
    messageSchema,
  );
}
