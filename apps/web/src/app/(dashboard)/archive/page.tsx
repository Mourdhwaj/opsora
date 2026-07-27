"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency, getInitials } from "@/lib/utils";
import {
  Search, Archive, Users, BedDouble, RotateCcw, Trash2,
  Clock, User, Phone, Mail, ChevronRight, ChevronLeft, X, AlertTriangle
} from "lucide-react";

// ── Interfaces ──────────────────────────────────────────────────────────────
interface ArchivedUser {
  id: string;
  originalId: string;
  email: string;
  phone?: string;
  fullName: string;
  role: string;
  archivedAt: string;
  archivedBy?: string;
  reason?: string;
}

interface ArchivedResident {
  id: string;
  originalId: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  occupation?: string;
  moveInDate?: string;
  moveOutDate?: string;
  rentAmount?: number;
  depositPaid?: number;
  archivedAt: string;
  archivedBy?: string;
  reason?: string;
}

interface ArchiveStats {
  archivedUsers: number;
  archivedResidents: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState<"users" | "residents">("users");
  const [stats, setStats] = useState<ArchiveStats>({ archivedUsers: 0, archivedResidents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Users
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });

  // Residents
  const [archivedResidents, setArchivedResidents] = useState<ArchivedResident[]>([]);
  const [residentsPagination, setResidentsPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });

  // Confirm modal
  const [confirmAction, setConfirmAction] = useState<{ type: "restore" | "delete"; id: string; name: string; tab: "users" | "residents" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const s = await api.get<ArchiveStats>("/archive/stats");
      setStats(s);
    } catch { /* ignore */ }
  }, []);

  // Fetch archived users
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: ArchivedUser[]; pagination: Pagination }>("/archive/users", { page: String(page), limit: "10", search });
      setArchivedUsers(res.data || []);
      setUsersPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch (err: any) {
      setError("Failed to load archived users: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch archived residents
  const fetchResidents = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: ArchivedResident[]; pagination: Pagination }>("/archive/residents", { page: String(page), limit: "10", search });
      setArchivedResidents(res.data || []);
      setResidentsPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch (err: any) {
      setError("Failed to load archived residents: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (activeTab === "users") fetchUsers(1);
    else fetchResidents(1);
  }, [activeTab, fetchUsers, fetchResidents]);

  // Reset page on search
  useEffect(() => {
    if (activeTab === "users") fetchUsers(1);
    else fetchResidents(1);
  }, [search]);

  // Execute action (restore or delete)
  const executeAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const endpoint = confirmAction.tab === "users" ? "users" : "residents";
      if (confirmAction.type === "restore") {
        await api.post(`/archive/${endpoint}/${confirmAction.id}/restore`, {});
      } else {
        await api.del(`/archive/${endpoint}/${confirmAction.id}`);
      }
      setConfirmAction(null);
      fetchStats();
      if (confirmAction.tab === "users") fetchUsers(usersPagination.page);
      else fetchResidents(residentsPagination.page);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const pagination = activeTab === "users" ? usersPagination : residentsPagination;
  const setPage = (p: number) => {
    if (activeTab === "users") fetchUsers(p);
    else fetchResidents(p);
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div><h1 className="text-2xl font-bold text-ink">Archive</h1></div>
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-ink-secondary">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Archive</h1>
        <p className="text-sm text-ink-secondary mt-1">Manage deactivated users and checked-out residents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{stats.archivedUsers}</p>
            <p className="text-xs text-ink-muted">Archived Users</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
            <BedDouble className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{stats.archivedResidents}</p>
            <p className="text-xs text-ink-muted">Archived Residents</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl border border-border p-1">
        <button
          onClick={() => { setActiveTab("users"); setSearch(""); }}
          className={cn("flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            activeTab === "users" ? "bg-accent text-white shadow-sm" : "text-ink-secondary hover:text-ink hover:bg-canvas"
          )}
        >
          <Users className="w-4 h-4" /> Users ({stats.archivedUsers})
        </button>
        <button
          onClick={() => { setActiveTab("residents"); setSearch(""); }}
          className={cn("flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            activeTab === "residents" ? "bg-accent text-white shadow-sm" : "text-ink-secondary hover:text-ink hover:bg-canvas"
          )}
        >
          <BedDouble className="w-4 h-4" /> Residents ({stats.archivedResidents})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
        <input
          type="text"
          placeholder={`Search archived ${activeTab}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Users Table */}
          {activeTab === "users" && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-canvas">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">User</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Archived</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Reason</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {archivedUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-muted">No archived users found</td></tr>
                  ) : archivedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-canvas/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-600">{getInitials(u.fullName)}</div>
                          <div>
                            <p className="text-sm font-medium text-ink">{u.fullName}</p>
                            <p className="text-xs text-ink-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-slate-50 text-slate-700 border-slate-200">{u.role}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-secondary">{formatDate(u.archivedAt)}</td>
                      <td className="px-5 py-3.5 text-sm text-ink-muted max-w-[200px] truncate">{u.reason || "-"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setConfirmAction({ type: "restore", id: u.id, name: u.fullName, tab: "users" })} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors" title="Restore">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmAction({ type: "delete", id: u.id, name: u.fullName, tab: "users" })} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Permanently delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Residents Table */}
          {activeTab === "residents" && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-canvas">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Resident</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Move-out</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Rent</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Reason</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {archivedResidents.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-muted">No archived residents found</td></tr>
                  ) : archivedResidents.map((r) => (
                    <tr key={r.id} className="hover:bg-canvas/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-xs font-semibold text-amber-600">{getInitials(r.fullName)}</div>
                          <div>
                            <p className="text-sm font-medium text-ink">{r.fullName}</p>
                            <p className="text-xs text-ink-muted">{r.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-secondary">{r.moveOutDate ? formatDate(r.moveOutDate) : "-"}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-ink">{r.rentAmount != null ? formatCurrency(r.rentAmount) : "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-ink-muted max-w-[200px] truncate">{r.reason || "-"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setConfirmAction({ type: "restore", id: r.id, name: r.fullName, tab: "residents" })} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors" title="Restore">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmAction({ type: "delete", id: r.id, name: r.fullName, tab: "residents" })} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Permanently delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-ink-muted">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1} className="px-2.5 py-1.5 rounded-lg text-sm border border-border hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm text-ink font-medium">{pagination.page} / {pagination.totalPages}</span>
            <button onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))} disabled={pagination.page >= pagination.totalPages} className="px-2.5 py-1.5 rounded-lg text-sm border border-border hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !actionLoading && setConfirmAction(null)} />
          <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center",
                confirmAction.type === "restore" ? "bg-emerald-50" : "bg-red-50"
              )}>
                {confirmAction.type === "restore"
                  ? <RotateCcw className="w-5 h-5 text-emerald-600" />
                  : <AlertTriangle className="w-5 h-5 text-red-500" />
                }
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">
                  {confirmAction.type === "restore" ? "Restore" : "Permanently Delete"}
                </h3>
                <p className="text-sm text-ink-muted">{confirmAction.name}</p>
              </div>
            </div>
            <p className="text-sm text-ink-secondary mb-6">
              {confirmAction.type === "restore"
                ? "This will restore the record and reactivate their account. Are you sure?"
                : "This action cannot be undone. The archived data will be permanently removed."
              }
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} disabled={actionLoading} className="px-4 py-2 rounded-lg border border-border hover:bg-canvas text-sm font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className={cn("px-4 py-2 rounded-lg text-sm font-medium text-white transition-all active:scale-[0.98]",
                  confirmAction.type === "restore" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600",
                  actionLoading && "opacity-60 cursor-not-allowed"
                )}
              >
                {actionLoading ? "Processing..." : confirmAction.type === "restore" ? "Restore" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
