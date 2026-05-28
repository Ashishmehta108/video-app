'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
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
        <Button variant="outline" size="sm">
          <Users className="mr-2 h-4 w-4" />
          Subgroups
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Breakout subgroups</DialogTitle>
          <DialogDescription>Create or join a subgroup for private discussion.</DialogDescription>
        </DialogHeader>
        <form onSubmit={create} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New subgroup name" />
          <Button type="submit">Create</Button>
        </form>
        <ul className="space-y-2">
          {subgroups.map((sg) => (
            <li key={sg.id} className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2">
              <span>{sg.name}</span>
              <Button size="sm" variant={activeId === sg.id ? 'default' : 'outline'} onClick={() => join(sg.id)}>
                {activeId === sg.id ? 'Joined' : 'Join'}
              </Button>
            </li>
          ))}
        </ul>
        {activeId && (
          <Button variant="secondary" onClick={leave}>
            Leave subgroup (back to main)
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
