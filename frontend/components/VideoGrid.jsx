'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

function VideoTile({ stream, label, muted = false, className }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn(
      'relative overflow-hidden rounded-[var(--rounded-lg)] bg-[var(--color-surface-dark-elevated)] aspect-video transition-shadow duration-200',
      className
    )}>
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <User className="h-8 w-8 text-white/40" />
          </div>
        </div>
      )}
      {label && (
        <span className="absolute bottom-3 left-3 rounded-[var(--rounded-sm)] bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  );
}

export function VideoGrid({ localVideoRef, localStream, remoteStreams, userName }) {
  const total = 1 + (remoteStreams?.length || 0);
  const gridClass =
    total <= 1
      ? 'grid-cols-1 max-w-3xl mx-auto'
      : total <= 4
        ? 'grid-cols-2'
        : 'grid-cols-3';

  return (
    <div className={cn('grid gap-3 h-full content-center', gridClass)}>
      <div className="relative overflow-hidden rounded-[var(--rounded-lg)] bg-[var(--color-surface-dark-elevated)] aspect-video">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover mirror"
        />
        <span className="absolute bottom-3 left-3 rounded-[var(--rounded-sm)] bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {userName} (You)
        </span>
      </div>
      {remoteStreams?.map(({ socketId, stream }) => (
        <VideoTile key={socketId} stream={stream} label="Participant" />
      ))}
    </div>
  );
}
