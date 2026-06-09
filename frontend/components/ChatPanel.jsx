'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chatApi } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

export function ChatPanel({ socket, roomId, subgroupId = null }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    chatApi
      .getMessages(roomId, subgroupId)
      .then(({ data }) => setMessages(data.messages || []))
      .finally(() => setLoading(false));
  }, [roomId, subgroupId]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      if (subgroupId && msg.subgroupId !== subgroupId) return;
      if (!subgroupId && msg.subgroupId) return;
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('chat-message', onMessage);
    return () => socket.off('chat-message', onMessage);
  }, [socket, subgroupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket?.emit('chat-message', { content: text.trim(), subgroupId });
    setText('');
  };

  const isOwn = (msg) => msg.userId === user?.id;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-hairline)] px-4 py-2.5">
        <span className="text-sm font-semibold text-[var(--color-ink)]">
          {subgroupId ? 'Subgroup chat' : 'Meeting chat'}
        </span>
      </div>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4">
          {loading && (
            <p className="animate-clay-pulse text-center text-sm text-[var(--color-muted)]">Loading messages...</p>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-center text-sm text-[var(--color-muted-soft)]">No messages yet. Start the conversation!</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`animate-clay-fade ${isOwn(m) ? 'ml-10 text-right' : 'mr-10'}`}
            >
              <div
                className={`inline-block rounded-[var(--rounded-lg)] px-3.5 py-2.5 text-sm ${
                  isOwn(m)
                    ? 'rounded-br-[var(--rounded-xs)] bg-[var(--color-brand-teal)] text-white'
                    : 'rounded-bl-[var(--rounded-xs)] bg-[var(--color-surface-card)] text-[var(--color-ink)]'
                }`}
              >
                {!isOwn(m) && (
                  <p className="mb-0.5 text-xs font-semibold text-[var(--color-brand-teal)]">{m.userName}</p>
                )}
                <p className="text-left">{m.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <form onSubmit={send} className="flex gap-2 border-t border-[var(--color-hairline)] p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="text-sm"
        />
        <Button type="submit" size="icon" variant="brand">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
