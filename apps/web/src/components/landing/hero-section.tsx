'use client';

import { SplitText, BlurText, MagneticButton, TiltedCard } from './animations';
import { useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

function DashboardMockup() {
  const tenants = [
    { name: 'Rajesh Kumar', room: '101-A', amount: '₹8,500', status: 'paid', color: 'text-emerald-400' },
    { name: 'Priya Sharma', room: '204-B', amount: '₹7,200', status: 'paid', color: 'text-emerald-400' },
    { name: 'Amit Patel', room: '302-A', amount: '₹8,500', status: 'due', color: 'text-amber-400' },
    { name: 'Sneha Reddy', room: '103-B', amount: '₹6,800', status: 'overdue', color: 'text-red-400' },
    { name: 'Vikram Singh', room: '401-A', amount: '₹9,200', status: 'paid', color: 'text-emerald-400' },
  ];

  return (
    <div className="rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] shadow-2xl overflow-hidden backdrop-blur-sm transition-all duration-300 group-hover:shadow-3xl blur-[0.5px] group-hover:blur-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Rent Collection — June 2026</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-[var(--color-border)]">
        {[
          { label: 'Total Collected', value: '₹3,12,400', sub: '94% collected' },
          { label: 'Pending', value: '₹18,500', sub: '3 tenants' },
          { label: 'Occupancy', value: '87%', sub: '52/60 beds' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--color-surface-elevated)] px-3 py-3">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{stat.label}</p>
            <p className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">{stat.value}</p>
            <p className="text-[10px] text-[var(--color-text-secondary)]">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Tenant list */}
      <div className="p-3 space-y-1.5">
        {tenants.map((t) => (
          <div key={t.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--color-surface)]/50 hover:bg-[var(--color-surface-hover)] transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--color-primary-light)]">
                {t.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-primary)]">{t.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Room {t.room}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">{t.amount}</p>
              <p className={`text-[10px] font-medium uppercase ${t.color}`}>{t.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center pt-16 pb-12 overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--color-primary)]/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Copy */}
          <div className="flex-1 max-w-2xl">
            <SplitText
              text="You didn't start a PG to solve math for mess bills."
              as="h1"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-[var(--color-text-primary)]"
              staggerChildren={0.04}
            />

            <div className="mt-6">
              {prefersReducedMotion ? (
                <p className="text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                  Stop chasing payments on WhatsApp. Opsora automates rent collection, splits utilities, and handles complaints so you can rest.
                </p>
              ) : (
                <p className="text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                  <BlurText
                    text="Stop chasing payments on WhatsApp. Opsora automates rent collection, splits utilities, and handles complaints so you can rest."
                    as="span"
                    delay={0.8}
                  />
                </p>
              )}
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-4">
              <MagneticButton range={40}>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-dark)] transition-all duration-200 shadow-lg shadow-[var(--color-primary)]/25 hover:shadow-[var(--color-primary)]/40"
                >
                  Start Free Trial
                  <span className="text-xs opacity-70">→</span>
                </a>
              </MagneticButton>
              <MagneticButton range={40}>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium text-sm hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-all duration-200"
                >
                  Explore Resident App
                </a>
              </MagneticButton>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {['R', 'P', 'A', 'S', 'V'].map((initial, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-[var(--color-surface)] flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][i],
                      color: 'white',
                      zIndex: 5 - i,
                    }}
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Trusted by 15+ PG owners</p>
                <p className="text-xs text-[var(--color-text-muted)]">in Bengaluru & growing</p>
              </div>
            </div>
          </div>

          {/* Right: Dashboard Mockup */}
          <div className="w-full lg:w-[420px] flex-shrink-0 group">
            <TiltedCard maxTilt={8} glareEnabled>
              <DashboardMockup />
            </TiltedCard>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">Scroll</span>
        <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" style={{ animation: prefersReducedMotion ? 'none' : 'float 2s ease-in-out infinite' }} />
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }`}</style>
      </div>
    </section>
  );
}
