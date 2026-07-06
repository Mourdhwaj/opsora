'use client';

import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Welcome back{user?.fullName ? `, ${user.fullName}` : ''}</p>
        </div>
        <button onClick={logout} className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors">Logout</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Residents', value: '52' },
          { label: 'Occupancy', value: '87%' },
          { label: 'Collected This Month', value: '₹3,12,400' },
          { label: 'Open Tickets', value: '3' },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">{s.label}</p>
            <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
