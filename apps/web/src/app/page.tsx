import { ClientOnly } from '@/components/ui/client-only';
import LandingPage from '@/components/landing/landing-page';

export default function Home() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-[var(--color-surface)]" />}>
      <LandingPage />
    </ClientOnly>
  );
}
