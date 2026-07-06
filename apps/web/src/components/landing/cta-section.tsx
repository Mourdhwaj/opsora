'use client';

import { BlurText, MagneticButton } from './animations';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-24 px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="relative p-12 sm:p-16 rounded-3xl bg-gradient-to-br from-[var(--color-surface-elevated)] to-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[var(--color-primary)]/10 rounded-full blur-[100px]" />
          </div>

          <div className="relative">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
              <BlurText text="Stop managing. Start growing." as="span" delay={0.1} />
            </h2>
            <p className="text-base text-[var(--color-text-secondary)] mb-8 max-w-lg mx-auto leading-relaxed">
              Join 15+ PG owners who automated their operations with Opsora. Free for up to 10 beds.
            </p>
            <MagneticButton range={40}>
              <a
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-base hover:bg-[var(--color-primary-dark)] transition-all duration-200 shadow-lg shadow-[var(--color-primary)]/25 hover:shadow-[var(--color-primary)]/40"
              >
                Claim Your Free Account
                <ArrowRight className="w-4 h-4" />
              </a>
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}
