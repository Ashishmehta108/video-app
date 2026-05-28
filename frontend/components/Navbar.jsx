'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Video, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/chat', label: 'Chat' },
  { href: '/admin', label: 'Admin', adminOnly: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage || loading) return null;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold hover:opacity-80">
          <Video className="h-5 w-5" />
          VideoMeet
        </Link>
        <nav className="flex items-center gap-4">
          {user &&
            navItems
              .filter((item) => !item.adminOnly || user.role === 'admin')
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm transition-colors hover:text-neutral-900',
                    pathname === item.href ? 'font-medium text-neutral-900' : 'text-neutral-500'
                  )}
                >
                  {item.label}
                </Link>
              ))}
        </nav>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-neutral-600">{user.name}</span>}
          {user && (
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
