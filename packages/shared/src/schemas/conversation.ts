import { z } from 'zod';

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  body: z.string(),
  createdAt: z.string(),
  mine: z.boolean().optional(),
});
export type Message = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  participants: z.array(z.object({
    id: z.string(),
    displayName: z.string(),
    handle: z.string(),
    avatarUrl: z.string().nullable(),
  })),
  lastMessagePreview: z.string(),
  lastMessageAt: z.string(),
  unreadCount: z.number(),
  online: z.boolean(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const messageListSchema = z.object({
  items: z.array(messageSchema),
  nextCursor: z.string().nullable(),
});

export const sendMessageSchema = z.object({ body: z.string().min(1) });
