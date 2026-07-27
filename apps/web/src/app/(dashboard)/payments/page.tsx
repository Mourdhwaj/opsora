"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import type { RentPayment } from "@/lib/types";
import { Search, Filter, IndianRupee, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    api.get<{ data: RentPayment[] }>("/payments")
      .then((res) => setPayments(res.data || []))
      .catch(() => setError("Failed to load payments"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter((p) => {
    const matchSearch = (p.tenantName?.toLowerCase().includes(search.toLowerCase())) ||
      (p.roomNumber?.includes(search));
    const matchStatus = statusFilter === "all" || p.paymentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = payments.filter((p) => p.paymentStatus === "paid").reduce((s, p) => s + p.paidAmount, 0);
  const totalPending = payments.filter((p) => p.paymentStatus === "pending").reduce((s, p) => s + p.balanceAmount, 0);
  const totalOverdue = payments.filter((p) => p.paymentStatus === "overdue").reduce((s, p) => s + p.balanceAmount, 0);

  const stats = [
    { label: "Total Collected", value: formatCurrency(totalPaid), icon: CheckCircle2, color: "text-accent bg-accent/10" },
    { label: "Pending", value: formatCurrency(totalPending), icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Overdue", value: formatCurrency(totalOverdue), icon: AlertCircle, color: "text-red-600 bg-red-50" },
  ];

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-ink">Payments</h1>
        </div>
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-ink-secondary">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink">Payments</h1>
        <p className="text-sm text-ink-secondary mt-1">Manage rent payments and track collection</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-border p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color} mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-ink">{s.value}</p>
            <p className="text-sm text-ink-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by tenant or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-canvas">
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Tenant</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Period</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Paid</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Balance</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-5 bg-canvas rounded animate-shimmer w-1/4" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink-muted">
                    No payments found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-ink">{p.tenantName || "Unknown"}</p>
                      <p className="text-xs text-ink-muted">Room {p.roomNumber || "-"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-secondary">{p.monthYear}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-ink">{formatCurrency(p.totalAmount)}</td>
                    <td className="px-5 py-3.5 text-sm text-accent font-medium">{formatCurrency(p.paidAmount)}</td>
                    <td className="px-5 py-3.5 text-sm text-ink">{formatCurrency(p.balanceAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", getStatusColor(p.paymentStatus))}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-muted">{formatDate(p.dueDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
