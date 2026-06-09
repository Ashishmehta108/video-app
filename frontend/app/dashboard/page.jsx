'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Plus, Video, Trash2, ArrowRight, Check, Clock, Hash } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [copiedId, setCopiedId] = useState(null);
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
    setCopiedId(roomId);
    setCreatedLink(link);
    setTimeout(() => setCopiedId(null), 2000);
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
    <div className="mx-auto max-w-5xl space-y-10 px-5 py-10">
      {/* Page header */}
      <div className="animate-clay-fade">
        <h1 className="text-display-sm">Dashboard</h1>
        <p className="mt-2 text-[var(--color-muted)]">Create or join video meetings</p>
      </div>

      {error && (
        <div className="animate-clay-fade rounded-[var(--rounded-md)] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {/* Create / Join cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Create meeting — teal feature card */}
        <div className="clay-feature-card clay-feature-teal animate-clay-fade transition-transform duration-200 hover:scale-[1.01]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--rounded-md)] bg-white/15">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create meeting</h2>
              <p className="text-sm text-white/70">Start a new room and invite others</p>
            </div>
          </div>
          <form onSubmit={createMeeting} className="space-y-3">
            <Input
              placeholder="Meeting title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/30"
            />
            <Button
              type="submit"
              className="w-full bg-white text-[var(--color-brand-teal)] hover:bg-white/90"
            >
              Create & join
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Join meeting — lavender feature card */}
        <div className="clay-feature-card clay-feature-lavender animate-clay-fade transition-transform duration-200 hover:scale-[1.01]" style={{ animationDelay: '0.05s' }}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--rounded-md)] bg-[var(--color-ink)]/10">
              <Video className="h-5 w-5 text-[var(--color-ink)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">Join meeting</h2>
              <p className="text-sm text-[var(--color-ink)]/60">Enter a room ID shared with you</p>
            </div>
          </div>
          <form onSubmit={joinMeeting} className="space-y-3">
            <Input
              placeholder="Paste room ID here"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              required
              className="border-[var(--color-ink)]/15 bg-white/50 focus:border-[var(--color-ink)]/30"
            />
            <Button type="submit" variant="outline" className="w-full border-[var(--color-ink)]/20 bg-white/60 hover:bg-white/80">
              Join room
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Created link banner */}
      {createdLink && (
        <div className="animate-clay-fade rounded-[var(--rounded-lg)] border border-[#bbf7d0] bg-[#dcfce7] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-[#15803d]">
              <Check className="h-4 w-4" />
              <span className="truncate font-medium">{createdLink}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-[#86efac] bg-white hover:bg-[#f0fdf4]"
              onClick={() => navigator.clipboard.writeText(createdLink)}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
        </div>
      )}

      {/* Meetings list */}
      <div className="animate-clay-fade" style={{ animationDelay: '0.1s' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-title-lg">Your meetings</h2>
          <span className="text-caption">{meetings.length} total</span>
        </div>

        {loading && (
          <div className="rounded-[var(--rounded-lg)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 text-center">
            <p className="animate-clay-pulse text-sm text-[var(--color-muted)]">Loading meetings...</p>
          </div>
        )}

        {!loading && meetings.length === 0 && (
          <div className="rounded-[var(--rounded-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-card)]">
              <Video className="h-5 w-5 text-[var(--color-muted)]" />
            </div>
            <p className="font-medium text-[var(--color-ink)]">No meetings yet</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Create one above to get started</p>
          </div>
        )}

        {!loading && meetings.length > 0 && (
          <div className="space-y-2">
            {meetings.map((m, i) => (
              <div
                key={m.id}
                className="group flex items-center justify-between rounded-[var(--rounded-lg)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-5 py-4 transition-all duration-200 hover:border-[var(--color-surface-strong)] hover:shadow-[var(--shadow-soft)]"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--rounded-md)] bg-[var(--color-surface-card)]">
                    <Video className="h-4 w-4 text-[var(--color-muted)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-ink)]">{m.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-muted-soft)]">
                      <Hash className="h-3 w-3" />
                      <span>{m.roomId}</span>
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === 'active' ? 'success' : 'secondary'}>
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${m.status === 'active' ? 'bg-[#22c55e]' : 'bg-[var(--color-muted-soft)]'}`} />
                    {m.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyLink(m.roomId)}
                    className="text-[var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {copiedId === m.roomId ? (
                      <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  {m.status === 'active' && (
                    <Button size="sm" variant="brand" asChild>
                      <Link href={`/meet/${m.roomId}`}>
                        Join
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMeeting(m.roomId)}
                    className="text-[var(--color-muted)] opacity-0 transition-opacity hover:text-[var(--color-brand-coral)] group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
