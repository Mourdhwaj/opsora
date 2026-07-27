"use client";

import { useAuth } from "@/lib/auth-context";
import { User, Mail, Phone, Home, Calendar, Shield } from "lucide-react";

export default function TenantProfilePage() {
  const { user } = useAuth();
  const info = [
    { label: "Full Name", value: user?.fullName || "Amit Patel", icon: User },
    { label: "Email", value: user?.email || "resident@sunshinepg.com", icon: Mail },
    { label: "Phone", value: "+919800000001", icon: Phone },
    { label: "Room", value: "101 · Bed B1", icon: Home },
    { label: "Move-in Date", value: "January 15, 2026", icon: Calendar },
    { label: "Role", value: "Resident", icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold text-ink">My Profile</h1><p className="text-ink-secondary mt-1">View and manage your profile</p></div>
      <div className="rounded-xl bg-surface border border-border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-xl font-bold text-accent">{user?.fullName ? user.fullName.split(" ").map(n => n[0]).join("") : "AP"}</div>
          <div><h2 className="text-xl font-bold text-ink">{user?.fullName || "Amit Patel"}</h2><p className="text-sm text-ink-muted">Resident at Sunshine PG</p></div>
        </div>
        <div className="space-y-4">
          {info.map((item) => (
            <div key={item.label} className="flex items-center gap-4 py-3 border-b border-border-subtle last:border-0">
              <item.icon className="w-5 h-5 text-ink-muted flex-shrink-0" />
              <div><p className="text-xs text-ink-muted">{item.label}</p><p className="text-sm font-medium text-ink">{item.value}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
