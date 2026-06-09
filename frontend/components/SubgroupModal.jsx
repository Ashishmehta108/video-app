'use client';

import { useEffect, useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { chatApi } from '@/lib/api';

export function SubgroupModal({ roomId, socket, onSelectSubgroup }) {
  const [subgroups, setSubgroups] = useState([]);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const load = () => {
    if (!roomId) return;
    chatApi.getSubgroups(roomId).then(({ data }) => setSubgroups(data.subgroups || []));
  };

  useEffect(() => {
    load();
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;
    const onJoined = ({ subgroupId }) => {
      setActiveId(subgroupId);
      onSelectSubgroup?.(subgroupId);
    };
    socket.on('subgroup-joined', onJoined);
    return () => socket.off('subgroup-joined', onJoined);
  }, [socket, onSelectSubgroup]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await chatApi.createSubgroup(roomId, name.trim());
    setName('');
    load();
  };

  const join = (id) => {
    socket?.emit('join-subgroup', { subgroupId: id });
    setActiveId(id);
    onSelectSubgroup?.(id);
    setOpen(false);
  };

  const leave = () => {
    if (activeId) socket?.emit('leave-subgroup', { subgroupId: activeId });
    setActiveId(null);
    onSelectSubgroup?.(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white/50 hover:bg-white/10 hover:text-white/80">
          <Users className="mr-1.5 h-3.5 w-3.5" />
          Subgroups
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Breakout subgroups</DialogTitle>
          <DialogDescription>Create or join a subgroup for private discussion.</DialogDescription>
        </DialogHeader>

        <form onSubmit={create} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New subgroup name"
          />
          <Button type="submit" variant="brand">
            <Plus className="mr-1.5 h-4 w-4" />
            Create
          </Button>
        </form>

        {subgroups.length === 0 && (
          <div className="rounded-[var(--rounded-md)] bg-[var(--color-surface-soft)] px-4 py-5 text-center">
            <Users className="mx-auto mb-2 h-5 w-5 text-[var(--color-muted-soft)]" />
            <p className="text-sm text-[var(--color-muted)]">No subgroups yet</p>
          </div>
        )}

        <ul className="space-y-2">
          {subgroups.map((sg) => (
            <li
              key={sg.id}
              className="flex items-center justify-between rounded-[var(--rounded-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-card)]"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-peach)]/30">
                  <Users className="h-3.5 w-3.5 text-[var(--color-brand-peach)]" />
                </div>
                <span className="text-sm font-medium text-[var(--color-ink)]">{sg.name}</span>
              </div>
              <Button
                size="sm"
                variant={activeId === sg.id ? 'brand' : 'outline'}
                onClick={() => join(sg.id)}
                className="h-8 text-xs"
              >
                {activeId === sg.id ? 'Joined' : 'Join'}
              </Button>
            </li>
          ))}
        </ul>

        {activeId && (
          <Button variant="secondary" onClick={leave} className="w-full">
            Leave subgroup (back to main)
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
