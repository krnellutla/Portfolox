import { useEffect, useRef, useState } from 'react';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import type { Message } from '../../lib/types.js';
import {
  CONVERSATION_GRADIENTS, CONVERSATIONS, MESSAGES, fmt,
} from './mock.js';

const ME_ID = 'ph1';
const ME_GRAD = 'linear-gradient(145deg,#bda988,#8a7150)';

let nextMsgId = 100;

// Simulate inbound WS messages after a short delay
function mockWsInbound(
  convId: string,
  senderId: string,
  cb: (msg: Message) => void,
) {
  const replies: Record<string, string> = {
    conv1: 'Will do! Speak soon.',
    conv2: 'That explains the light — pure magic.',
    conv3: 'Excited for you! Let me know how the prints look.',
  };
  const body = replies[convId];
  if (!body) return;
  const delay = 1500 + Math.random() * 1000;
  setTimeout(() => {
    cb({
      id: `ws-${nextMsgId++}`,
      conversationId: convId,
      senderId,
      body,
      createdAt: new Date().toISOString(),
    });
  }, delay);
}

export default function ChatPage() {
  const [activeConvId, setActiveConvId] = useState('conv1');
  const [messages, setMessages] = useState<Record<string, Message[]>>(MESSAGES);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsFiredRef = useRef(false);

  const activeConv = CONVERSATIONS.find((c) => c.id === activeConvId)!;
  const thread = messages[activeConvId] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length]);

  function sendMessage() {
    if (!input.trim()) return;
    const msg: Message = {
      id: `m-${nextMsgId++}`,
      conversationId: activeConvId,
      senderId: ME_ID,
      body: input.trim(),
      createdAt: new Date().toISOString(),
      mine: true,
    };
    setMessages((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), msg],
    }));
    setInput('');
    wsFiredRef.current = false;

    // Simulate typing indicator then inbound reply
    if (!wsFiredRef.current) {
      wsFiredRef.current = true;
      const otherId = activeConv.participants[0].id;
      setTyping(true);
      setTimeout(() => setTyping(false), 2000);
      mockWsInbound(activeConvId, otherId, (inbound) => {
        setTyping(false);
        setMessages((prev) => ({
          ...prev,
          [activeConvId]: [...(prev[activeConvId] ?? []), inbound],
        }));
      });
    }
  }

  const filteredConvs = CONVERSATIONS.filter((c) =>
    c.participants[0].displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-8 pt-8 pb-24">
        <Eyebrow className="mb-4">06 — Chat</Eyebrow>

        <div
          className="border border-line rounded-[16px] overflow-hidden"
          style={{ height: '660px', display: 'flex' }}
        >
          {/* Conversation list */}
          <div className="w-[320px] shrink-0 border-r border-line flex flex-col bg-[#faf9f6]">
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
              {filteredConvs.map((conv) => {
                const other = conv.participants[0];
                const isActive = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      isActive ? 'bg-surface border-r-2 border-ink' : 'hover:bg-canvas'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div
                        className="w-10 h-10 rounded-full"
                        style={{ background: CONVERSATION_GRADIENTS[conv.id] }}
                      />
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full bg-positive border-2 border-[#faf9f6]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className="text-[13.5px] font-semibold text-ink truncate">{other.displayName}</span>
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

          {/* Message thread */}
          <div className="flex-1 flex flex-col">
            {/* Thread header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line bg-surface">
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-full"
                  style={{ background: CONVERSATION_GRADIENTS[activeConvId] }}
                />
                {activeConv.online && (
                  <span className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full bg-positive border-2 border-surface" />
                )}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-ink">{activeConv.participants[0].displayName}</p>
                <p className="font-mono text-[10px] text-positive">● Online now</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink transition-colors text-[16px]">⌕</button>
                <button className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink transition-colors text-[18px]">···</button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 bg-[#faf9f6]">
              {/* TODAY divider */}
              <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-line" />
                <span className="font-mono text-[10px] text-muted">TODAY</span>
                <span className="flex-1 h-px bg-line" />
              </div>

              {thread.map((msg) => {
                const isMine = msg.mine || msg.senderId === ME_ID;
                return (
                  <div key={msg.id} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                    {!isMine && (
                      <div
                        className="w-7 h-7 rounded-full shrink-0 mt-auto"
                        style={{ background: CONVERSATION_GRADIENTS[activeConvId] }}
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
                      <div
                        className="w-7 h-7 rounded-full shrink-0 mt-auto"
                        style={{ background: ME_GRAD }}
                      />
                    )}
                  </div>
                );
              })}

              {typing && (
                <div className="flex gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full shrink-0"
                    style={{ background: CONVERSATION_GRADIENTS[activeConvId] }}
                  />
                  <div className="px-4 py-3 bg-surface border border-line rounded-[14px_14px_14px_4px]">
                    <span className="font-mono text-[12px] text-muted tracking-widest">•••</span>
                  </div>
                </div>
              )}

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
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="px-4 py-[9px] bg-ink text-paper rounded-[9px] font-semibold text-[13px] hover:bg-ink-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
