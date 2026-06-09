'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

const STT_MODES = [
  { value: 'transcribe', label: 'Transcribe' },
  { value: 'translate', label: 'Translate' },
  { value: 'verbatim', label: 'Verbatim' },
];

export function TranscriptPanel({
  entries,
  interim,
  listening,
  supported,
  sttStatus = 'idle',
  sttError,
  sttMode = 'transcribe',
  sttBackend,
  onModeChange,
  onStart,
  onStop,
}) {
  const statusVariant =
    sttStatus === 'ready' || sttStatus === 'browser'
      ? 'success'
      : sttStatus === 'error'
        ? 'destructive'
        : 'secondary';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-2.5">
        <span className="text-sm font-semibold text-[var(--color-ink)]">Live transcript</span>
        <div className="flex items-center gap-2">
          {!supported && <Badge variant="destructive">Unavailable</Badge>}
          <Badge variant={listening ? 'success' : 'secondary'}>
            {listening ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-clay-pulse" />
                Listening
              </span>
            ) : 'Off'}
          </Badge>
          <Badge variant={statusVariant}>Sarvam STT</Badge>
          {listening ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onStop}
              className="h-7 text-xs"
            >
              <MicOff className="mr-1 h-3 w-3" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="brand"
              onClick={onStart}
              disabled={sttStatus === 'connecting'}
              className="h-7 text-xs"
            >
              <Mic className="mr-1 h-3 w-3" />
              Start
            </Button>
          )}
        </div>
      </div>

      {onModeChange && !listening && (
        <div className="flex gap-1 border-b border-[var(--color-hairline)] px-4 py-2">
          {STT_MODES.map((m) => (
            <Button
              key={m.value}
              size="sm"
              variant={sttMode === m.value ? 'default' : 'ghost'}
              className="h-7 text-xs"
              onClick={() => onModeChange(m.value)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4 text-sm">
          {!supported && (
            <div className="rounded-[var(--rounded-md)] border border-[var(--color-brand-ochre)]/30 bg-[var(--color-brand-ochre)]/10 px-3.5 py-2.5 text-xs text-[var(--color-brand-ochre)]">
              Your browser must support mic capture and Web Audio. Sarvam handles the transcription.
            </div>
          )}
          {entries.length === 0 && !interim && (
            <p className="text-center text-sm text-[var(--color-muted-soft)]">
              Start transcription to see live text here
            </p>
          )}
          {entries.map((e) => (
            <div key={e.id} className={`animate-clay-fade ${e.isFinal ? '' : 'opacity-60'}`}>
              <span className="font-semibold text-[var(--color-brand-teal)]">{e.userName}: </span>
              <span className="text-[var(--color-body)]">{e.text}</span>
            </div>
          ))}
          {interim && (
            <div className="animate-clay-pulse">
              <span className="font-semibold text-[var(--color-brand-lavender)]">Live: </span>
              <span className="italic text-[var(--color-muted)]">{interim}</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
