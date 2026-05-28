'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/lib/api';

export function AdminPanel() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [a, u, m] = await Promise.all([
        adminApi.analytics(),
        adminApi.users(),
        adminApi.meetings(),
      ]);
      setAnalytics(a.data.analytics);
      setUsers(u.data.users);
      setMeetings(m.data.meetings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleBan = async (id, banned) => {
    await adminApi.banUser(id, !banned);
    load();
  };

  const endMeeting = async (id) => {
    await adminApi.endMeeting(id);
    load();
  };

  if (loading) return <p className="text-neutral-500">Loading admin data...</p>;

  return (
    <div className="space-y-6">
      {analytics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(analytics).map(([key, value]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize text-neutral-500">
                  {key.replace(/([A-Z])/g, ' $1')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-neutral-200">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-neutral-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.banned ? 'destructive' : 'success'}>{u.banned ? 'Banned' : 'Active'}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleBan(u.id, u.banned)}>
                    {u.banned ? 'Unban' : 'Ban'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-neutral-200">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-neutral-500">Room: {m.roomId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === 'active' ? 'success' : 'secondary'}>{m.status}</Badge>
                  {m.status === 'active' && (
                    <Button size="sm" variant="destructive" onClick={() => endMeeting(m.id)}>
                      End
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
