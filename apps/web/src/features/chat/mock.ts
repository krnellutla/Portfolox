import type { Conversation, Message } from '../../lib/types.js';

export const CONVERSATIONS: Array<Conversation & { gradient: string }> = [
  {
    id: 'conv1',
    participants: [{ id: 'ph2', displayName: 'Ridge Studio', handle: 'studio.ridge', avatarUrl: null }],
    lastMessagePreview: "Sounds great, I'll send the files over tonight.",
    lastMessageAt: '2026-06-21T10:30:00Z',
    unreadCount: 2,
    online: true,
    gradient: 'linear-gradient(145deg,#7e8893,#525c68)',
  },
  {
    id: 'conv2',
    participants: [{ id: 'ph3', displayName: 'K. Møller', handle: 'k.møller', avatarUrl: null }],
    lastMessagePreview: 'That tonal range is stunning — Iceland shoot?',
    lastMessageAt: '2026-06-20T18:00:00Z',
    unreadCount: 0,
    online: true,
    gradient: 'linear-gradient(145deg,#9aa79b,#5f6f63)',
  },
  {
    id: 'conv3',
    participants: [{ id: 'ph4', displayName: 'Noah Petersen', handle: 'noahp', avatarUrl: null }],
    lastMessagePreview: 'Did you end up going with the Hahnemühle for the giclées?',
    lastMessageAt: '2026-06-19T12:00:00Z',
    unreadCount: 0,
    online: false,
    gradient: 'linear-gradient(145deg,#bda988,#8a7150)',
  },
];

export const CONVERSATION_GRADIENTS: Record<string, string> = {
  conv1: 'linear-gradient(145deg,#7e8893,#525c68)',
  conv2: 'linear-gradient(145deg,#9aa79b,#5f6f63)',
  conv3: 'linear-gradient(145deg,#bda988,#8a7150)',
};

export const MESSAGES: Record<string, Message[]> = {
  conv1: [
    { id: 'm1', conversationId: 'conv1', senderId: 'ph2', body: 'Hey Mira! Loved the Iceland set — did you print any of them yet?', createdAt: '2026-06-21T09:00:00Z' },
    { id: 'm2', conversationId: 'conv1', senderId: 'ph1', body: "Thanks! Not yet — I'm evaluating Hahnemühle vs. Canson for the giclées. Leaning Hahnemühle for the warm tones.", createdAt: '2026-06-21T09:05:00Z', mine: true },
    { id: 'm3', conversationId: 'conv1', senderId: 'ph2', body: 'Good call. Hahnemühle Photo Rag holds highlights beautifully. What size are you targeting?', createdAt: '2026-06-21T09:10:00Z' },
    { id: 'm4', conversationId: 'conv1', senderId: 'ph1', body: '24×36 for "First Light" and maybe a smaller 16×20 edition.', createdAt: '2026-06-21T10:00:00Z', mine: true },
    { id: 'm5', conversationId: 'conv1', senderId: 'ph2', body: "Sounds great, I'll send the files over tonight.", createdAt: '2026-06-21T10:30:00Z' },
  ],
  conv2: [
    { id: 'm6', conversationId: 'conv2', senderId: 'ph3', body: 'That tonal range is stunning — Iceland shoot?', createdAt: '2026-06-20T18:00:00Z' },
    { id: 'm7', conversationId: 'conv2', senderId: 'ph1', body: 'Yes! Ring Road trip in May. Shot mostly at 5am before tourist vans showed up.', createdAt: '2026-06-20T18:15:00Z', mine: true },
  ],
  conv3: [
    { id: 'm8', conversationId: 'conv3', senderId: 'ph1', body: 'Just placed an order with Fotografische — fingers crossed!', createdAt: '2026-06-19T11:00:00Z', mine: true },
    { id: 'm9', conversationId: 'conv3', senderId: 'ph4', body: 'Did you end up going with the Hahnemühle for the giclées?', createdAt: '2026-06-19T12:00:00Z' },
  ],
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export { fmt };
