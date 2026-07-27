"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor, cn } from "@/lib/utils";
import { Home, CreditCard, AlertTriangle, Calendar, Wifi, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TenantProfile { id: string; fullName: string; moveInDate: string; rentAmount: number; roomNumber?: string; bedNumber?: string; }
interface Payment { id: string; monthYear: string; rentAmount: number; paidAmount: number; balanceAmount: number; paymentStatus: string; dueDate: string; }
interface Complaint { id: string; title: string; status: string; }

export default function TenantDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get<TenantProfile>("/tenant/profile"),
      api.get<{ payments: Payment[] }>("/tenant/payments"),
      api.get<{ complaints: Complaint[] }>("/tenant/complaints"),
    ]).then(([p, pay, c]) => {
      if (p.status === "fulfilled") setProfile(p.value);
      if (pay.status === "fulfilled") setPayments(pay.value?.payments || []);
      if (c.status === "fulfilled") setComplaints(c.value?.complaints || []);
    }).finally(() => setLoading(false));
  }, []);

  const pending = payments.filter((p) => p.paymentStatus === "pending" || p.paymentStatus === "partial");
  const openComplaints = complaints.filter((c) => c.status === "open" || c.status === "in_progress");
  const latest = payments[0];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Welcome back, {user?.fullName?.split(" ")[0] || "Resident"}</h1>
        <p className="text-ink-secondary mt-1">Here&apos;s an overview of your stay at Sunshine PG</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><Home className="w-5 h-5 text-accent" /></div><span className="text-sm font-medium text-ink-secondary">Room</span></div>
          <p className="text-xl font-bold text-ink">{profile?.roomNumber || "101"}</p>
          <p className="text-sm text-ink-muted">Bed {profile?.bedNumber || "B1"}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-success" /></div><span className="text-sm font-medium text-ink-secondary">Rent</span></div>
          <p className="text-xl font-bold text-ink">{formatCurrency(profile?.rentAmount || 8000)}</p>
          <p className="text-sm text-ink-muted">per month</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-warning" /></div><span className="text-sm font-medium text-ink-secondary">Open Tickets</span></div>
          <p className="text-xl font-bold text-ink">{openComplaints.length}</p>
          <p className="text-sm text-ink-muted">complaints pending</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-info" /></div><span className="text-sm font-medium text-ink-secondary">Since</span></div>
          <p className="text-xl font-bold text-ink">{formatDate(profile?.moveInDate || "2026-01-15")}</p>
          <p className="text-sm text-ink-muted">move-in date</p>
        </div>
      </div>
      {latest && (
        <div className="rounded-xl bg-surface border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Payment Status</h2>
            <Link href="/tenant/payments" className="text-sm text-accent hover:text-accent-dark flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-canvas border border-border-subtle">
            <div><p className="text-sm font-medium text-ink">Latest: {latest.monthYear}</p><p className="text-sm text-ink-muted mt-0.5">Due: {formatDate(latest.dueDate)}</p></div>
            <div className="text-right"><p className="text-lg font-bold text-ink">{formatCurrency(latest.rentAmount)}</p><span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1", getStatusColor(latest.paymentStatus))}>{latest.paymentStatus}</span></div>
          </div>
          {pending.length > 0 && <div className="mt-3 p-3 rounded-lg bg-warning/5 border border-warning/20"><p className="text-sm text-warning font-medium">You have {pending.length} pending payment(s) totaling {formatCurrency(pending.reduce((s, p) => s + p.balanceAmount, 0))}</p></div>}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/tenant/payments" className="p-5 rounded-xl bg-surface border border-border hover:border-accent/30 hover:shadow-sm transition-all group">
          <CreditCard className="w-6 h-6 text-accent mb-3 group-hover:scale-110 transition-transform" /><h3 className="font-semibold text-ink mb-1">Pay Rent</h3><p className="text-sm text-ink-secondary">View and pay your rent online</p>
        </Link>
        <Link href="/tenant/complaints" className="p-5 rounded-xl bg-surface border border-border hover:border-accent/30 hover:shadow-sm transition-all group">
          <AlertTriangle className="w-6 h-6 text-warning mb-3 group-hover:scale-110 transition-transform" /><h3 className="font-semibold text-ink mb-1">Raise Complaint</h3><p className="text-sm text-ink-secondary">Report an issue or maintenance request</p>
        </Link>
        <Link href="/tenant/food" className="p-5 rounded-xl bg-surface border border-border hover:border-accent/30 hover:shadow-sm transition-all group">
          <Wifi className="w-6 h-6 text-success mb-3 group-hover:scale-110 transition-transform" /><h3 className="font-semibold text-ink mb-1">Today&apos;s Menu</h3><p className="text-sm text-ink-secondary">Check today&apos;s meals and vote</p>
        </Link>
      </div>
    </div>
  );
}
