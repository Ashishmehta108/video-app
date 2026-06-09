'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Video, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-5">
      <div className="w-full max-w-md animate-clay-fade">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--rounded-lg)] bg-[var(--color-brand-teal)]">
            <Video className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-display-sm">Welcome back</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Sign in to access your meetings
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-[var(--rounded-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 shadow-[var(--shadow-card)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-[var(--rounded-sm)] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#dc2626]">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-ink)]">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-ink)]">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="animate-clay-pulse">Signing in...</span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-[var(--color-ink)] underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:decoration-[var(--color-ink)]"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
