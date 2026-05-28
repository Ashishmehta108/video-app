'use client';

import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <div className="flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={audioEnabled ? 'secondary' : 'destructive'} size="icon" onClick={onToggleAudio}>
              {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{audioEnabled ? 'Mute' : 'Unmute'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={videoEnabled ? 'secondary' : 'destructive'} size="icon" onClick={onToggleVideo}>
              {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{videoEnabled ? 'Stop camera' : 'Start camera'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={screenSharing ? 'default' : 'secondary'} size="icon" onClick={onToggleScreen}>
              <MonitorUp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{screenSharing ? 'Stop sharing' : 'Share screen'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" size="icon" onClick={onLeave}>
              <PhoneOff className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Leave meeting</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
