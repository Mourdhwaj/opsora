'use client';

import { Zap, Shield, PieChart, Users, Bell, Droplets } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Instant UPI Payments', desc: 'Residents pay with one tap. Auto-reconciled receipts.' },
  { icon: Shield, title: 'Proof Verification', desc: 'Screenshot OCR verifies payment authenticity automatically.' },
  { icon: PieChart, title: 'Analytics Dashboard', desc: 'Revenue trends, occupancy rates, collection % — all visualized.' },
  { icon: Users, title: 'Multi-Property', desc: 'Manage 1 or 100 properties from a single dashboard.' },
  { icon: Bell, title: 'Smart Reminders', desc: 'WhatsApp & SMS reminders before due dates. Zero chasing.' },
  { icon: Droplets, title: 'IoT Integration', desc: 'Water tank levels, electricity meters — real-time monitoring.' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-primary-light)] mb-3">Features</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)]">
            Everything you need. Nothing you don't.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-primary)]/5"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)]/20 transition-colors">
                <f.icon className="w-5 h-5 text-[var(--color-primary-light)]" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1.5">{f.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
