'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STT_STATUS_LABEL = {
  idle: 'Idle',
  connecting: 'Sarvam connecting…',
  ready: 'Sarvam connected',
  browser: 'Browser STT',
  error: 'STT error',
};

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
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <span className="text-sm font-medium">Live transcript</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!supported && <Badge variant="destructive">Unavailable</Badge>}
          <Badge variant={listening ? 'success' : 'secondary'}>
            {listening ? 'Listening' : 'Off'}
          </Badge>
          <Badge variant={statusVariant}>{
          // STT_STATUS_LABEL[sttStatus] 
          'Sarvam STT'
          }</Badge>
          {listening ? (
            <Button size="sm" variant="outline" onClick={onStop}>
              Stop
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onStart} disabled={sttStatus === 'connecting'}>
              Start
            </Button>
          )}
        </div>
      </div>
      {onModeChange && !listening && (
        <div className="flex gap-1 border-b border-neutral-100 px-3 py-2">
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
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-3 text-sm">
          {!supported && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Your browser must support mic capture and Web Audio. Sarvam handles the transcription.
            </p>
          )}
          {/* {sttBackend === 'browser' && (
            <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Using browser speech recognition (Chrome/Edge recommended). Add SARVAM_API_KEY for
              Sarvam streaming STT.
            </p>
          )} */}
          {/* {sttError && (
            <p
              className={`rounded-md border px-3 py-2 text-xs ${
                sttStatus === 'browser'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {sttError}
              {sttError.includes('SARVAM_API_KEY') && (
                <span className="mt-1 block">
                  Set SARVAM_API_KEY in backend .env and restart the server, or use browser STT in
                  Chrome/Edge.
                </span>
              )}
            </p>
          )} */}
          {entries.map((e) => (
            <p key={e.id} className={e.isFinal ? '' : 'italic text-neutral-500'}>
              <span className="font-medium">{e.userName}: </span>
              {e.text}
            </p>
          ))}
          {interim && (
            <p className="italic text-neutral-400">
              <span className="font-medium">Live: </span>
              {interim}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
