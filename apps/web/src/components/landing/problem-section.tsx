'use client';

import { BlurText } from './animations';
import { MessageSquare, Calculator, FileText, Clock } from 'lucide-react';

const problems = [
  {
    icon: MessageSquare,
    title: 'WhatsApp Payment Chasing',
    desc: 'Endless "paid?" messages. Screenshots lost in chat. No audit trail.',
  },
  {
    icon: Calculator,
    title: 'Manual Mess Bills',
    desc: 'Excel sheets, calculator apps, and arguments over electricity splits.',
  },
  {
    icon: FileText,
    title: 'Complaint Black Holes',
    desc: 'Residents complain, nobody tracks it. Issues pile up silently.',
  },
  {
    icon: Clock,
    title: 'No Time to Manage',
    desc: 'You started a PG for passive income, not a full-time ops job.',
  },
];

export function ProblemSection() {
  return (
    <section className="py-24 px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-primary-light)] mb-3">The Problem</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] leading-tight">
            <BlurText text="Running a PG shouldn't feel like a second job." as="span" delay={0.1} />
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {problems.map((p) => (
            <div
              key={p.title}
              className="group relative p-6 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-primary)]/5"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)]/20 transition-colors">
                <p.icon className="w-5 h-5 text-[var(--color-primary-light)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{p.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
