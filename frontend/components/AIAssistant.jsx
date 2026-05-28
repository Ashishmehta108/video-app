'use client';

import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sarvamApi } from '@/lib/api';

export function AIAssistant({ transcriptText = '' }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const q = question.trim();
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const { data } = await sarvamApi.ask(q, transcriptText);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          note: data.note,
          source: data.source,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: err.response?.data?.error || 'Failed to get response' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 text-sm font-medium">
        <Sparkles className="h-4 w-4" />
        AI Assistant
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-3 py-3 text-sm">
          {messages.length === 0 && (
            <p className="text-neutral-500">Ask about the meeting — summaries, action items, or suggestions.</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 ${
                m.role === 'user' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'
              }`}
            >
              <p>{m.text}</p>
              {m.note && <p className="mt-1 text-xs text-neutral-500">{m.note}</p>}
            </div>
          ))}
          {loading && <p className="text-neutral-500">Thinking...</p>}
        </div>
      </ScrollArea>
      <form onSubmit={ask} className="flex gap-2 border-t border-neutral-200 p-3">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask the assistant..." />
        <Button type="submit" size="icon" disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
