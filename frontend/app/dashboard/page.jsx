'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Plus, Video, Trash2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { meetApi } from '@/lib/api';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [title, setTitle] = useState('');
  const [joinId, setJoinId] = useState('');
  const [createdLink, setCreatedLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    meetApi
      .list()
      .then(({ data }) => setMeetings(data.meetings || []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load meetings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const createMeeting = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await meetApi.create(title || 'New Meeting');
      const link = `${window.location.origin}/meet/${data.meeting.roomId}`;
      setCreatedLink(link);
      load();
      router.push(`/meet/${data.meeting.roomId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create meeting');
    }
  };

  const joinMeeting = async (e) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    setError('');
    try {
      await meetApi.join(joinId.trim());
      router.push(`/meet/${joinId.trim()}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join meeting');
    }
  };

  const copyLink = (roomId) => {
    const link = `${window.location.origin}/meet/${roomId}`;
    navigator.clipboard.writeText(link);
    setCreatedLink(link);
  };

  const deleteMeeting = async (roomId) => {
    if (!window.confirm('Delete this meeting and all associated data?')) return;
    try {
      await meetApi.remove(roomId);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete meeting');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-neutral-500">Create or join video meetings</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create meeting
            </CardTitle>
            <CardDescription>Start a new room and invite others</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createMeeting} className="space-y-3">
              <Input placeholder="Meeting title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Button type="submit" className="w-full">
                Create & join
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Join meeting
            </CardTitle>
            <CardDescription>Enter a room ID shared with you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={joinMeeting} className="space-y-3">
              <Input placeholder="Room ID" value={joinId} onChange={(e) => setJoinId(e.target.value)} required />
              <Button type="submit" variant="outline" className="w-full">
                Join
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {createdLink && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <p className="truncate text-sm">{createdLink}</p>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(createdLink)}>
              <Copy className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your meetings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-neutral-500">Loading...</p>}
          {!loading && meetings.length === 0 && (
            <p className="text-sm text-neutral-500">No meetings yet. Create one above.</p>
          )}
          <ul className="divide-y divide-neutral-200">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-neutral-500">Room: {m.roomId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === 'active' ? 'success' : 'secondary'}>{m.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => copyLink(m.roomId)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  {m.status === 'active' && (
                    <Button size="sm" asChild>
                      <Link href={`/meet/${m.roomId}`}>Join</Link>
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => deleteMeeting(m.roomId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
