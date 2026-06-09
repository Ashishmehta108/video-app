'use client';

import { useState } from 'react';
import { Sparkles, Send, Bot, User } from 'lucide-react';
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
      <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] px-4 py-2.5">
        <Sparkles className="h-4 w-4 text-[var(--color-brand-ochre)]" />
        <span className="text-sm font-semibold text-[var(--color-ink)]">AI Assistant</span>
      </div>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4 text-sm">
          {messages.length === 0 && (
            <div className="rounded-[var(--rounded-lg)] bg-[var(--color-surface-card)] p-5 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand-ochre)]/15">
                <Sparkles className="h-5 w-5 text-[var(--color-brand-ochre)]" />
              </div>
              <p className="font-medium text-[var(--color-ink)]">Ask about the meeting</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Summaries, action items, or suggestions
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className="animate-clay-fade">
              <div className="mb-1 flex items-center gap-1.5">
                {m.role === 'user' ? (
                  <User className="h-3 w-3 text-[var(--color-muted)]" />
                ) : (
                  <Bot className="h-3 w-3 text-[var(--color-brand-lavender)]" />
                )}
                <span className="text-xs font-medium text-[var(--color-muted)]">
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </span>
              </div>
              <div
                className={`rounded-[var(--rounded-lg)] px-3.5 py-2.5 ${
                  m.role === 'user'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-brand-lavender)]/15 text-[var(--color-ink)] border border-[var(--color-brand-lavender)]/20'
                }`}
              >
                <p>{m.text}</p>
                {m.note && (
                  <p className="mt-2 border-t border-[var(--color-brand-lavender)]/20 pt-2 text-xs text-[var(--color-muted)]">
                    {m.note}
                  </p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 animate-clay-pulse">
              <Bot className="h-3 w-3 text-[var(--color-brand-lavender)]" />
              <span className="text-sm text-[var(--color-muted)]">Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={ask} className="flex gap-2 border-t border-[var(--color-hairline)] p-3">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the assistant..."
          className="text-sm"
        />
        <Button type="submit" size="icon" variant="brand" disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
