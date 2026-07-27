"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn, getInitials } from "@/lib/utils";
import { Building2, LayoutDashboard, AlertTriangle, Users, ClipboardList, LogOut, Menu, X, Bell, CheckSquare } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/staff-portal", icon: LayoutDashboard },
  { label: "Tasks", href: "/staff-portal/tasks", icon: ClipboardList },
  { label: "Complaints", href: "/staff-portal/complaints", icon: AlertTriangle },
  { label: "Residents", href: "/staff-portal/residents", icon: Users },
  { label: "Checklist", href: "/staff-portal/checklist", icon: CheckSquare },
];

export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[100dvh] flex bg-canvas">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform transition-transform duration-200 ease-out lg:translate-x-0 lg:static lg:z-auto flex flex-col", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
          <div><span className="text-lg font-bold text-ink tracking-tight">Opsora</span><span className="block text-[10px] text-ink-muted -mt-0.5">Staff Portal</span></div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-ink-muted hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/staff-portal" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150", isActive ? "bg-accent/8 text-accent" : "text-ink-secondary hover:bg-canvas hover:text-ink")}>
                  <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-accent")} />{item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="p-3 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-canvas">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">{user ? getInitials(user.fullName) : "?"}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-ink truncate">{user?.fullName || "Staff"}</p><p className="text-xs text-ink-muted capitalize">{user?.role || "staff"}</p></div>
            <button onClick={logout} className="p-1.5 rounded-md text-ink-muted hover:text-danger hover:bg-danger-light transition-colors" title="Sign out"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-8 flex-shrink-0 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-ink-secondary hover:text-ink"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-3 ml-auto"><button className="relative p-2 rounded-lg text-ink-secondary hover:text-ink hover:bg-canvas transition-colors"><Bell className="w-5 h-5" /><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse-dot" /></button></div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
