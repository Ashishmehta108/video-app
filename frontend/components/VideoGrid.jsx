'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

function VideoTile({ stream, label, muted = false, className }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-neutral-900 aspect-video', className)}>
      <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      {label && (
        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
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
      ? 'grid-cols-1'
      : total <= 4
        ? 'grid-cols-2'
        : 'grid-cols-3';

  return (
    <div className={cn('grid gap-3', gridClass)}>
      <div className="relative overflow-hidden rounded-lg bg-neutral-900 aspect-video">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover mirror"
        />
        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
          {userName} (You)
        </span>
      </div>
      {remoteStreams?.map(({ socketId, stream }) => (
        <VideoTile key={socketId} stream={stream} label={`Participant`} />
      ))}
    </div>
  );
}
