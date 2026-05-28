'use client';

import { useEffect, useState } from 'react';
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

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket?.emit('chat-message', { content: text.trim(), subgroupId });
    setText('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 px-3 py-2 text-sm font-medium">
        {subgroupId ? 'Subgroup chat' : 'Meeting chat'}
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-3">
          {loading && <p className="text-sm text-neutral-500">Loading...</p>}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.userId === user?.id ? 'ml-8 bg-neutral-900 text-white' : 'mr-8 bg-neutral-100'
              }`}
            >
              <p className="text-xs font-medium opacity-70">{m.userName}</p>
              <p>{m.content}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={send} className="flex gap-2 border-t border-neutral-200 p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
        <Button type="submit" size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
