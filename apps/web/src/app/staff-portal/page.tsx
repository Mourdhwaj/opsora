"use client";

import { useAuth } from "@/lib/auth-context";
import { ClipboardList, AlertTriangle, Users, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";

export default function StaffPortalDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-ink">Staff Dashboard</h1><p className="text-ink-secondary mt-1">Welcome, {user?.fullName || "Staff Member"}</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-accent" /></div><span className="text-sm font-medium text-ink-secondary">Pending Tasks</span></div>
          <p className="text-2xl font-bold text-ink">5</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-warning" /></div><span className="text-sm font-medium text-ink-secondary">Open Complaints</span></div>
          <p className="text-2xl font-bold text-ink">3</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-success" /></div><span className="text-sm font-medium text-ink-secondary">Completed</span></div>
          <p className="text-2xl font-bold text-ink">12</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center"><Users className="w-5 h-5 text-info" /></div><span className="text-sm font-medium text-ink-secondary">Residents</span></div>
          <p className="text-2xl font-bold text-ink">62</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/staff-portal/tasks" className="p-5 rounded-xl bg-surface border border-border hover:border-accent/30 hover:shadow-sm transition-all group"><ClipboardList className="w-6 h-6 text-accent mb-3 group-hover:scale-110 transition-transform" /><h3 className="font-semibold text-ink mb-1">My Tasks</h3><p className="text-sm text-ink-secondary">View assigned tasks</p></Link>
        <Link href="/staff-portal/complaints" className="p-5 rounded-xl bg-surface border border-border hover:border-accent/30 hover:shadow-sm transition-all group"><AlertTriangle className="w-6 h-6 text-warning mb-3 group-hover:scale-110 transition-transform" /><h3 className="font-semibold text-ink mb-1">Complaints</h3><p className="text-sm text-ink-secondary">Handle resident complaints</p></Link>
        <Link href="/staff-portal/checklist" className="p-5 rounded-xl bg-surface border border-border hover:border-accent/30 hover:shadow-sm transition-all group"><Clock className="w-6 h-6 text-info mb-3 group-hover:scale-110 transition-transform" /><h3 className="font-semibold text-ink mb-1">Daily Checklist</h3><p className="text-sm text-ink-secondary">Complete daily duties</p></Link>
      </div>
    </div>
  );
}
