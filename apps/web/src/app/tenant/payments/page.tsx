"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface Payment { id: string; monthYear: string; rentAmount: number; paidAmount: number; balanceAmount: number; paymentStatus: string; dueDate: string; }

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ payments: Payment[] }>("/tenant/payments").then((d) => setPayments(d?.payments || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-ink">My Payments</h1><p className="text-ink-secondary mt-1">View your rent payment history</p></div>
      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-canvas">
              <th className="text-left px-4 py-3 font-medium text-ink-secondary">Month</th>
              <th className="text-right px-4 py-3 font-medium text-ink-secondary">Rent</th>
              <th className="text-right px-4 py-3 font-medium text-ink-secondary">Paid</th>
              <th className="text-right px-4 py-3 font-medium text-ink-secondary">Balance</th>
              <th className="text-center px-4 py-3 font-medium text-ink-secondary">Status</th>
              <th className="text-left px-4 py-3 font-medium text-ink-secondary">Due Date</th>
            </tr></thead>
            <tbody>
              {payments.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">No payment records</td></tr> :
                payments.map((p) => (
                  <tr key={p.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas/50">
                    <td className="px-4 py-3 font-medium text-ink">{p.monthYear}</td>
                    <td className="px-4 py-3 text-right text-ink">{formatCurrency(p.rentAmount)}</td>
                    <td className="px-4 py-3 text-right text-ink">{formatCurrency(p.paidAmount)}</td>
                    <td className="px-4 py-3 text-right text-ink">{formatCurrency(p.balanceAmount)}</td>
                    <td className="px-4 py-3 text-center"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.paymentStatus)}`}>{p.paymentStatus}</span></td>
                    <td className="px-4 py-3 text-ink-secondary">{formatDate(p.dueDate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
