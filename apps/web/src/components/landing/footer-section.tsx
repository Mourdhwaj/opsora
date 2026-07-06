'use client';

import { Building2 } from 'lucide-react';

const links = {
  Product: ['Features', 'Pricing', 'Integrations', 'API'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

export function FooterSection() {
  return (
    <footer className="border-t border-[var(--color-border)] py-16 px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-6 h-6 text-[var(--color-primary-light)]" />
              <span className="text-lg font-bold text-[var(--color-text-primary)]">Opsora</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              PG &amp; hostel management software that actually works. Built for Indian property owners.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            &copy; {new Date().getFullYear()} Opsora. All rights reserved.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Made with care in Bengaluru, India
          </p>
        </div>
      </div>
    </footer>
  );
}
