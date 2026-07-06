'use client';

import { BlurText } from './animations';
import { CreditCard, BarChart3, Headphones, Smartphone } from 'lucide-react';

const solutions = [
  {
    icon: CreditCard,
    title: 'Automated Rent Collection',
    desc: 'Send invoices via WhatsApp automatically. Residents pay via UPI. You get real-time tracking.',
    color: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    icon: BarChart3,
    title: 'Smart Utility Splitting',
    desc: 'Electricity, water, maintenance — auto-calculated per resident based on occupancy and config.',
    color: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    icon: Headphones,
    title: 'Ticket Management',
    desc: 'Complaints become trackable tickets. Assign to staff, track resolution, collect feedback.',
    color: 'from-amber-500/20 to-orange-500/20',
  },
  {
    icon: Smartphone,
    title: 'Resident Self-Service',
    desc: 'Your residents get their own portal — pay rent, raise complaints, vote on food, all in one app.',
    color: 'from-purple-500/20 to-pink-500/20',
  },
];

export function SolutionSection() {
  return (
    <section className="py-24 px-6 lg:px-8 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--color-primary)]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-success)] mb-3">The Solution</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] leading-tight">
            <BlurText text="One platform. Zero spreadsheets." as="span" delay={0.1} />
          </h2>
          <p className="mt-4 text-base text-[var(--color-text-secondary)] leading-relaxed">
            <BlurText text="Opsora replaces your WhatsApp chaos with a single command center for your PG or hostel." as="span" delay={0.3} />
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {solutions.map((s, i) => (
            <div
              key={s.title}
              className="group relative p-6 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-primary)]/5"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4`}>
                <s.icon className="w-6 h-6 text-[var(--color-text-primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{s.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
