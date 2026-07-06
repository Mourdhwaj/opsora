'use client';

import { HeroSection } from './hero-section';
import { ProblemSection } from './problem-section';
import { SolutionSection } from './solution-section';
import { FeaturesSection } from './features-section';
import { SetupSection } from './setup-section';
import { CtaSection } from './cta-section';
import { FooterSection } from './footer-section';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[var(--color-primary-light)]" />
          <span className="text-lg font-bold text-[var(--color-text-primary)]">Opsora</span>
        </Link>
        <div className="hidden sm:flex items-center gap-8">
          <a href="#features" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <a href="/login" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Log in</a>
          <a
            href="/login"
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <SetupSection />
        <CtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
