'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Building2, Eye, EyeOff, ArrowRight, Shield, Users, User, Loader2 } from 'lucide-react';

const demoAccounts = [
  { email: 'admin@sunshinepg.com', role: 'Owner', icon: Shield, color: 'bg-accent-light text-accent', desc: 'Full admin access' },
  { email: 'staff@sunshinepg.com', role: 'Staff', icon: Users, color: 'bg-info-light text-info', desc: 'Task & checklist management' },
  { email: 'resident@sunshinepg.com', role: 'Resident', icon: User, color: 'bg-secondary-light text-secondary', desc: 'Portal for tenants' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading, authError, clearAuthError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role === 'resident') router.push('/tenant');
    else if (user.role === 'staff') router.push('/staff-portal');
    else router.push('/dashboard');
  }, [user, authLoading, router]);

  // Show auth context errors (e.g., user not found in Firestore)
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearAuthError();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {

      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left Panel: Brand */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-accent-light via-canvas to-canvas relative overflow-hidden items-center justify-center">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute -bottom-48 -right-24 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl" />

        <div className="relative z-10 max-w-lg px-16">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-ink tracking-tight">Opsora</span>
          </div>

          <h1 className="text-[2.75rem] font-bold text-ink leading-[1.1] mb-5 tracking-tight">
            Operating system for{' '}
            <span className="text-accent">modern PG</span>{' '}
            management
          </h1>
          <p className="text-lg text-ink-secondary leading-relaxed mb-12">
            Manage residents, rooms, payments, complaints, IoT dashboards, and staff operations — all from a single platform.
          </p>

          <div className="space-y-5">
            {[
              { text: 'Real-time occupancy tracking', icon: '📊' },
              { text: 'Automated rent collection & receipts', icon: '💰' },
              { text: 'Smart complaint management with SLA', icon: '🎫' },
              { text: 'IoT water & electricity monitoring', icon: '⚡' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-base flex-shrink-0 shadow-xs">
                  {feature.icon}
                </div>
                <span className="text-sm font-medium text-ink-secondary">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shadow-md shadow-accent/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-ink tracking-tight">Opsora</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-ink mb-2 tracking-tight">Sign in</h2>
            <p className="text-ink-secondary text-[15px]">Enter your credentials to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-ink mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full h-12 px-4 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-ink mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-accent/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-5 rounded-2xl bg-canvas border border-border">
            <p className="text-xs font-semibold text-ink-muted mb-4 uppercase tracking-wider">Quick access — demo accounts</p>
            <div className="space-y-2">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.email}
                    onClick={() => fillDemo(account.email)}
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-surface transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${account.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{account.email}</p>
                      <p className="text-xs text-ink-muted">{account.role} · {account.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink-muted mt-4 text-center">Password for all: <code className="font-mono bg-surface px-1.5 py-0.5 rounded">password123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
