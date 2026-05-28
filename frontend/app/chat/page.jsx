'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { meetApi } from '@/lib/api';

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatHub />
    </ProtectedRoute>
  );
}

function ChatHub() {
  const [roomId, setRoomId] = useState('');
  const [meetings, setMeetings] = useState([]);

  const load = () => {
    meetApi.list().then(({ data }) => setMeetings(data.meetings?.filter((m) => m.status === 'active') || []));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <h1 className="text-2xl font-bold">Chat hub</h1>
      <Card>
        <CardHeader>
          <CardTitle>Join meeting chat</CardTitle>
          <CardDescription>Open an active meeting room to use chat outside the video view</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (roomId) window.location.href = `/meet/${roomId}`;
            }}
            className="flex gap-2"
          >
            <Input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Room ID" />
            <Button type="submit">Open</Button>
          </form>
          <ul className="space-y-2">
            {meetings.map((m) => (
              <li key={m.id}>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`/meet/${m.roomId}`}>{m.title} — {m.roomId}</a>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
