'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children, adminOnly = false }) {
  const router = useRouter();
  const { user, loading } = useAuth(true);

  useEffect(() => {
    if (!loading && user && adminOnly && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [loading, user, adminOnly, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!user) return null;
  if (adminOnly && user.role !== 'admin') return null;

  return children;
}
