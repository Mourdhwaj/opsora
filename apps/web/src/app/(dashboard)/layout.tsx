import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard – Opsora',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <aside className="fixed inset-y-0 left-0 w-64 bg-[var(--color-surface-elevated)] border-r border-[var(--color-border)] p-4">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-6">Opsora Dashboard</h2>
        <nav className="space-y-1">
          <a href="/dashboard" className="block px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors">Overview</a>
          <a href="/residents" className="block px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors">Residents</a>
          <a href="/properties" className="block px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors">Properties</a>
          <a href="/payments" className="block px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors">Payments</a>
          <a href="/complaints" className="block px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors">Complaints</a>
        </nav>
      </aside>
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
