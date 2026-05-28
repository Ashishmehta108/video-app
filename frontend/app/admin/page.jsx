'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminPanel } from '@/components/AdminPanel';

export default function AdminPage() {
  return (
    <ProtectedRoute adminOnly>
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-6 text-2xl font-bold">Admin dashboard</h1>
        <AdminPanel />
      </div>
    </ProtectedRoute>
  );
}
