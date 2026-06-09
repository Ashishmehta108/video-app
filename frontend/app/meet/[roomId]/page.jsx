'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Copy, Check, Hash, Signal } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VideoGrid } from '@/components/VideoGrid';
import { MeetControls } from '@/components/MeetControls';
import { ChatPanel } from '@/components/ChatPanel';
import { SubgroupModal } from '@/components/SubgroupModal';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { AIAssistant } from '@/components/AIAssistant';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useTranscript } from '@/hooks/useTranscript';
import { meetApi } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

export default function MeetPage({ params }) {
  const { roomId } = use(params);
  return (
    <ProtectedRoute>
      <MeetRoom roomId={roomId} />
    </ProtectedRoute>
  );
}

function MeetRoom({ roomId }) {
  const router = useRouter();
  const { user } = useAuth();
  const { socket, connected, error: socketError } = useSocket(roomId);
  const [subgroupId, setSubgroupId] = useState(null);
  const [meetError, setMeetError] = useState('');
  const [copied, setCopied] = useState(false);

  const webrtc = useWebRTC(socket, roomId);
  const transcript = useTranscript(socket, roomId, true);

  const transcriptContext = transcript.entries.map((e) => `${e.userName}: ${e.text}`).join('\n');

  const handleLeave = () => {
    webrtc.leave();
    disconnectSocket();
    router.push('/dashboard');
  };

  const handleDeleteMeeting = async () => {
    if (!window.confirm('Delete this meeting and all related chat and transcript data?')) return;
    try {
      await meetApi.remove(roomId);
      handleLeave();
    } catch (err) {
      setMeetError(err.response?.data?.error || 'Could not delete meeting');
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    meetApi.join(roomId).catch((err) => {
      setMeetError(err.response?.data?.error || 'Could not join meeting');
    });
  }, [roomId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-[var(--color-surface-dark)]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Signal className={`h-3.5 w-3.5 ${connected ? 'text-[var(--color-success)]' : 'text-[var(--color-muted-soft)] animate-clay-pulse'}`} />
            <span className="text-sm font-medium text-white/90">
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          <span className="text-white/20">·</span>
          <button
            onClick={handleCopyRoomId}
            className="flex items-center gap-1.5 rounded-[var(--rounded-sm)] px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/8 hover:text-white/70"
          >
            <Hash className="h-3 w-3" />
            {roomId}
            {copied ? (
              <Check className="h-3 w-3 text-[var(--color-success)]" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
          {socketError && (
            <Badge variant="destructive" className="text-xs">{socketError}</Badge>
          )}
          {meetError && (
            <Badge variant="warning" className="text-xs">{meetError}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SubgroupModal roomId={roomId} socket={socket} onSelectSubgroup={setSubgroupId} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteMeeting}
            className="text-white/50 hover:bg-[var(--color-brand-coral)]/20 hover:text-[var(--color-brand-coral)]"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-4">
            <VideoGrid
              localVideoRef={webrtc.localVideoRef}
              remoteStreams={webrtc.remoteStreams}
              userName={user?.name || 'You'}
            />
          </div>
          <div className="flex justify-center pb-5">
            <MeetControls
              audioEnabled={webrtc.audioEnabled}
              videoEnabled={webrtc.videoEnabled}
              screenSharing={webrtc.screenSharing}
              onToggleAudio={webrtc.toggleAudio}
              onToggleVideo={webrtc.toggleVideo}
              onToggleScreen={webrtc.toggleScreenShare}
              onLeave={handleLeave}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-[360px] border-l border-[var(--color-hairline)] bg-[var(--color-canvas)]">
          <Tabs defaultValue="chat" className="flex h-full flex-col">
            <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="m-0 flex-1 overflow-hidden">
              <ChatPanel socket={socket} roomId={roomId} subgroupId={subgroupId} />
            </TabsContent>
            <TabsContent value="transcript" className="m-0 flex-1 overflow-hidden">
              <TranscriptPanel
                entries={transcript.entries}
                interim={transcript.interim}
                listening={transcript.listening}
                supported={transcript.supported}
                sttStatus={transcript.sttStatus}
                sttError={transcript.sttError}
                sttMode={transcript.sttMode}
                sttBackend={transcript.sttBackend}
                onModeChange={transcript.setSttMode}
                onStart={transcript.startListening}
                onStop={transcript.stopListening}
              />
            </TabsContent>
            <TabsContent value="ai" className="m-0 flex-1 overflow-hidden">
              <AIAssistant transcriptText={transcriptContext} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
