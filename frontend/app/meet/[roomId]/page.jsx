'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VideoGrid } from '@/components/VideoGrid';
import { MeetControls } from '@/components/MeetControls';
import { ChatPanel } from '@/components/ChatPanel';
import { SubgroupModal } from '@/components/SubgroupModal';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { AIAssistant } from '@/components/AIAssistant';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const webrtc = useWebRTC(socket, roomId);
  const transcript = useTranscript(socket, roomId, true);
console.log(transcript);
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

  useEffect(() => {
    meetApi.join(roomId).catch((err) => {
      setMeetError(err.response?.data?.error || 'Could not join meeting');
    });
  }, [roomId]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
        <div>
          <h1 className="font-semibold">Room: {roomId}</h1>
          <p className="text-xs text-neutral-500">
            {connected ? 'Connected' : 'Connecting...'}
            {socketError && ` - ${socketError}`}
            {meetError && ` - ${meetError}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SubgroupModal roomId={roomId} socket={socket} onSelectSubgroup={setSubgroupId} />
          <button
            type="button"
            onClick={handleDeleteMeeting}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col p-4">
          <VideoGrid
            localVideoRef={webrtc.localVideoRef}
            remoteStreams={webrtc.remoteStreams}
            userName={user?.name || 'You'}
          />
          <div className="mt-4 flex justify-center">
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

        <aside className="w-96 border-l border-neutral-200 bg-white">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 overflow-hidden m-0">
              <ChatPanel socket={socket} roomId={roomId} subgroupId={subgroupId} />
            </TabsContent>
            <TabsContent value="transcript" className="flex-1 overflow-hidden m-0">
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
            <TabsContent value="ai" className="flex-1 overflow-hidden m-0">
              <AIAssistant transcriptText={transcriptContext} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
