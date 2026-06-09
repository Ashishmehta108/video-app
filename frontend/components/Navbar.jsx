'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Video, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/chat', label: 'Chat' },
  { href: '/admin', label: 'Admin', adminOnly: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isAuthPage || loading) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--rounded-sm)] bg-[var(--color-brand-teal)]">
            <Video className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
            VideoMeet
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {user &&
            navItems
              .filter((item) => !item.adminOnly || user.role === 'admin')
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-[var(--rounded-sm)] px-3.5 py-2 text-sm font-medium transition-all duration-200',
                    pathname === item.href
                      ? 'bg-[var(--color-surface-card)] text-[var(--color-ink)]'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]'
                  )}
                >
                  {item.label}
                </Link>
              ))}
        </nav>

        {/* Right side */}
        <div className="hidden items-center gap-3 md:flex">
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-lavender)] text-xs font-semibold text-[var(--color-ink)]">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-sm font-medium text-[var(--color-body)]">{user.name}</span>
            </div>
          )}
          {user && (
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-[var(--rounded-sm)] text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)] md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="animate-clay-fade border-t border-[var(--color-hairline)] bg-[var(--color-canvas)] px-5 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {user &&
              navItems
                .filter((item) => !item.adminOnly || user.role === 'admin')
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'rounded-[var(--rounded-sm)] px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                      pathname === item.href
                        ? 'bg-[var(--color-surface-card)] text-[var(--color-ink)]'
                        : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)]'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
          </nav>
          {user && (
            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-lavender)] text-xs font-semibold text-[var(--color-ink)]">
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="text-sm font-medium text-[var(--color-body)]">{user.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
