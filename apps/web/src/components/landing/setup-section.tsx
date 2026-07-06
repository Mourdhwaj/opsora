'use client';

import { BlurText } from './animations';
import { Upload, Settings, Rocket } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: Upload,
    title: 'Add Your Properties',
    desc: 'Import rooms, beds, and floors in minutes. Bulk upload from Excel or set up manually.',
  },
  {
    num: '02',
    icon: Settings,
    title: 'Configure Billing',
    desc: 'Set rent, utility rates, food charges. Opsora handles the math for every resident.',
  },
  {
    num: '03',
    icon: Rocket,
    title: 'Go Live',
    desc: 'Invite residents. They get a self-service portal. You get your evenings back.',
  },
];

export function SetupSection() {
  return (
    <section className="py-24 px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-primary-light)] mb-3">Getting Started</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)]">
            <BlurText text="Live in 3 simple steps." as="span" delay={0.1} />
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden sm:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

          {steps.map((s) => (
            <div key={s.num} className="relative text-center">
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center mb-6">
                <s.icon className="w-7 h-7 text-[var(--color-primary-light)]" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center">
                  {s.num}
                </span>
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">{s.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
