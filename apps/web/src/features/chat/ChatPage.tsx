import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Message } from '@blueflutes/shared';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { StateView } from '../../components/ui/StateView.js';
import { SkeletonRow } from '../../components/ui/Skeleton.js';
import { listConversations, getMessages, sendMessage } from '../../api/conversations.js';
import { connectWs, disconnectWs } from '../../api/ws.js';
import { qk } from '../../lib/query-client.js';
import { seedAvatarUrl } from '../../lib/seed-photos.js';

function fmt(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ME_AVATAR = seedAvatarUrl(0, 28);

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connectWs();
    return () => disconnectWs();
  }, []);

  const { data: conversations, isLoading: convsLoading } = useQuery({
    queryKey: qk.conversations(),
    queryFn: listConversations,
  });

  useEffect(() => {
    if (!activeConvId && conversations && conversations.length > 0) {
      setActiveConvId(conversations[0]?.id ?? null);
    }
  }, [conversations, activeConvId]);

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: qk.conversationMessages(activeConvId ?? ''),
    queryFn: () => getMessages(activeConvId!),
    enabled: !!activeConvId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.items.length]);

  const sendMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => sendMessage(id, body),
    onMutate: ({ id, body }) => {
      const optimistic: Message = {
        id: `opt-${Date.now()}`,
        conversationId: id,
        senderId: 'me',
        body,
        createdAt: new Date().toISOString(),
        mine: true,
      };
      queryClient.setQueryData(
        qk.conversationMessages(id),
        (old: { items: Message[]; nextCursor: string | null } | undefined) =>
          old ? { ...old, items: [...old.items, optimistic] } : old,
      );
    },
    onSettled: () => {
      if (activeConvId) {
        void queryClient.invalidateQueries({ queryKey: qk.conversationMessages(activeConvId) });
        void queryClient.invalidateQueries({ queryKey: qk.conversations() });
      }
    },
  });

  function handleSend() {
    if (!input.trim() || !activeConvId) return;
    sendMutation.mutate({ id: activeConvId, body: input.trim() });
    setInput('');
  }

  const filteredConvs = (conversations ?? []).filter((c) =>
    c.participants[0]?.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  const activeConv = conversations?.find((c) => c.id === activeConvId);
  const messages = thread?.items ?? [];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-32 md:pb-24">
        <Eyebrow className="mb-4">06 — Chat</Eyebrow>

        <div className="border border-line rounded-[16px] overflow-hidden h-[calc(100dvh-4rem)] flex md:grid md:grid-cols-[280px_1fr]">
          {/* Conversation list — hidden on mobile when a conversation is active */}
          <div className={`${activeConvId ? 'hidden md:flex' : 'flex'} shrink-0 border-r border-line flex-col bg-[#faf9f6] w-full md:w-auto`}>
            <div className="p-4 border-b border-line">
              <p className="font-serif text-[20px] font-[500] text-ink mb-3">Messages</p>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-[9px] bg-surface border border-field rounded-[9px] text-[13px] text-ink placeholder:text-muted outline-none focus:border-ink transition-colors"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {convsLoading && (
                <div className="px-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              )}
              {!convsLoading && filteredConvs.length === 0 && (
                <StateView
                  variant="empty"
                  title="No conversations yet"
                  description="Message a photographer from their portfolio."
                  action={
                    <a
                      href="/discover"
                      className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors"
                    >
                      Discover photographers
                    </a>
                  }
                />
              )}
              {filteredConvs.map((conv, i) => {
                const other = conv.participants[0];
                const isActive = conv.id === activeConvId;
                const avatarSrc = other?.avatarUrl ?? seedAvatarUrl(i, 40);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      isActive ? 'bg-surface border-r-2 border-ink' : 'hover:bg-canvas'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={avatarSrc}
                        alt={other?.displayName ?? ''}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full bg-positive border-2 border-[#faf9f6]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className="text-[13.5px] font-semibold text-ink truncate">{other?.displayName}</span>
                        <span className="font-mono text-[10px] text-muted ml-2 shrink-0">
                          {fmt(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-[12px] text-ink-3 truncate">{conv.lastMessagePreview}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-ink text-paper font-mono text-[10px] flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message thread — hidden on mobile when no conversation is active */}
          <div className={`${activeConvId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
            {activeConv ? (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line bg-surface">
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden mr-1 text-ink-3 hover:text-ink transition-colors text-[18px] whitespace-nowrap"
                    aria-label="Back to conversations"
                  >
                    ←
                  </button>
                  <div className="relative">
                    <img
                      src={activeConv.participants[0]?.avatarUrl ?? seedAvatarUrl(0, 36)}
                      alt={activeConv.participants[0]?.displayName ?? ''}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    {activeConv.online && (
                      <span className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full bg-positive border-2 border-surface" />
                    )}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{activeConv.participants[0]?.displayName}</p>
                    <p className="font-mono text-[10px] text-positive">
                      {activeConv.online ? '● Online now' : '○ Offline'}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink transition-colors text-[16px]">⌕</button>
                    <button className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink transition-colors text-[18px]">···</button>
                  </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 bg-[#faf9f6]">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 h-px bg-line" />
                    <span className="font-mono text-[10px] text-muted">TODAY</span>
                    <span className="flex-1 h-px bg-line" />
                  </div>

                  {threadLoading && <StateView variant="loading" title="Loading messages…" />}

                  {messages.map((msg, i) => {
                    const isMine = msg.mine || msg.senderId === 'me';
                    const otherAvatar = activeConv.participants[0]?.avatarUrl ?? seedAvatarUrl(i, 28);
                    return (
                      <div key={msg.id} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                        {!isMine && (
                          <img
                            src={otherAvatar}
                            alt=""
                            className="w-7 h-7 rounded-full shrink-0 mt-auto object-cover"
                          />
                        )}
                        <div className={`max-w-[68%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <div
                            className={`px-4 py-2.5 text-[13.5px] leading-[1.5] ${
                              isMine
                                ? 'bg-ink text-paper rounded-[14px_14px_4px_14px]'
                                : 'bg-surface border border-line text-ink rounded-[14px_14px_14px_4px]'
                            }`}
                          >
                            {msg.body}
                          </div>
                          <span className="font-mono text-[9.5px] text-muted px-1">{fmt(msg.createdAt)}</span>
                        </div>
                        {isMine && (
                          <img
                            src={ME_AVATAR}
                            alt="me"
                            className="w-7 h-7 rounded-full shrink-0 mt-auto object-cover"
                          />
                        )}
                      </div>
                    );
                  })}

                  <div ref={bottomRef} />
                </div>

                {/* Composer */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-t border-line bg-surface">
                  <button className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink transition-colors text-[20px] font-light">＋</button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message…"
                    className="flex-1 px-3 py-[9px] bg-canvas border border-field rounded-[9px] text-[13.5px] text-ink placeholder:text-muted outline-none focus:border-ink transition-colors"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sendMutation.isPending}
                    className="px-4 py-[9px] bg-ink text-paper rounded-[9px] font-semibold text-[13px] hover:bg-ink-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <StateView variant="empty" title="Select a conversation" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
