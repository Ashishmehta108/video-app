'use client';

import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function ControlButton({ active, danger, onClick, tooltip, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
            danger
              ? 'bg-[var(--color-brand-coral)] text-white hover:bg-[#e85a4a] shadow-lg shadow-[var(--color-brand-coral)]/20'
              : active
                ? 'bg-white/15 text-white hover:bg-white/20'
                : 'bg-[var(--color-brand-coral)]/20 text-[var(--color-brand-coral)] hover:bg-[var(--color-brand-coral)]/30'
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function MeetControls({
  audioEnabled,
  videoEnabled,
  screenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreen,
  onLeave,
}) {
  return (
    <TooltipProvider>
      <div className="clay-glass-dark flex items-center gap-3 rounded-full px-5 py-3 shadow-[var(--shadow-elevated)]">
        <ControlButton
          active={audioEnabled}
          onClick={onToggleAudio}
          tooltip={audioEnabled ? 'Mute' : 'Unmute'}
        >
          {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </ControlButton>

        <ControlButton
          active={videoEnabled}
          onClick={onToggleVideo}
          tooltip={videoEnabled ? 'Stop camera' : 'Start camera'}
        >
          {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </ControlButton>

        <ControlButton
          active={!screenSharing}
          onClick={onToggleScreen}
          tooltip={screenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <MonitorUp className={`h-5 w-5 ${screenSharing ? 'text-[var(--color-brand-mint)]' : ''}`} />
        </ControlButton>

        <div className="mx-1 h-6 w-px bg-white/15" />

        <ControlButton danger onClick={onLeave} tooltip="Leave meeting">
          <PhoneOff className="h-5 w-5" />
        </ControlButton>
      </div>
    </TooltipProvider>
  );
}
