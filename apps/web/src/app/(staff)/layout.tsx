import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff Portal – Opsora',
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="h-16 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] px-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Staff Portal</h2>
        <a href="/" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Home</a>
      </header>
      <main className="p-8">{children}</main>
    </div>
  );
}
