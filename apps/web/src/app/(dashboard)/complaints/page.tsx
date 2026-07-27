"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn, formatDateTime, getStatusColor, getInitials, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Search, Plus, AlertTriangle, Clock, User, MapPin, Building2,
  ChevronRight, X, MessageSquare, CheckCircle2, Circle, ArrowRight,
  Send, BarChart3, AlertCircle, ChevronDown, Users, Timer,
  Eye, EyeOff, Loader2, Check, FileText, Shield,
} from "lucide-react";

// ── Interfaces ──────────────────────────────────────────────────────────────
interface Complaint {
  id: string;
  propertyId: string;
  roomId?: string;
  bedId?: string;
  tenantProfileId?: string;
  ticketNumber: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionNotes?: string;
  tenantRating?: number;
  tenantFeedback?: string;
  createdBy?: string;
  tenantName?: string;
  roomNumber?: string;
  propertyName?: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
  slaStatus?: "green" | "amber" | "red" | "breached";
}

interface Comment {
  id: string;
  complaintId?: string;
  userId?: string;
  comment: string;
  isInternal?: boolean;
  createdAt: string;
  authorName?: string;
}

// ── SLA Configuration ───────────────────────────────────────────────────────
const SLA_HOURS: Record<string, number> = {
  urgent: 4,
  high: 24,
  medium: 72,
  low: 168,
};

function getSLAInfo(createdAt: string, priority: string): { hoursLeft: number; status: "green" | "amber" | "red" | "breached"; label: string } {
  const created = new Date(createdAt).getTime();
  const deadline = created + (SLA_HOURS[priority] || 72) * 60 * 60 * 1000;
  const now = Date.now();
  const hoursLeft = Math.round((deadline - now) / (60 * 60 * 1000));
  
  if (hoursLeft <= 0) return { hoursLeft: 0, status: "breached", label: "Breached" };
  if (hoursLeft <= 2) return { hoursLeft, status: "red", label: `${hoursLeft}h left` };
  if (hoursLeft <= SLA_HOURS[priority] * 0.3) return { hoursLeft, status: "amber", label: `${hoursLeft}h left` };
  return { hoursLeft, status: "green", label: `${hoursLeft}h left` };
}

const slaColors = {
  green: "bg-green-100 text-green-700 border-green-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
  breached: "bg-red-500 text-white border-red-600",
};

// ── Constants ───────────────────────────────────────────────────────────────
const statusWorkflow = [
  { key: "open", label: "New", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Circle },
  { key: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  { key: "resolved", label: "Resolved", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  { key: "closed", label: "Closed", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Circle },
];

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "P1 - Urgent", color: "text-red-700", bg: "bg-red-100 border-red-200" },
  high: { label: "P2 - High", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  medium: { label: "P3 - Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
  low: { label: "P4 - Low", color: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
};

const categoryIcons: Record<string, string> = {
  plumbing: "🔧", electrical: "⚡", cleaning: "🧹", maintenance: "🛠️",
  pest_control: "🐛", wifi: "📶", food: "🍽️", security: "🔒",
  noise: "🔊", other: "📋",
};

const categories = ["plumbing", "electrical", "cleaning", "maintenance", "pest_control", "wifi", "food", "security", "noise", "other"];

// ── Component ───────────────────────────────────────────────────────────────
export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [staffList, setStaffList] = useState<Array<{ id: string; fullName: string; role: string; phone: string; openTicketCount: number }>>([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Create ticket form
  const [createForm, setCreateForm] = useState({
    category: "plumbing",
    priority: "medium",
    title: "",
    description: "",
    tenantName: "",
    roomNumber: "",
    propertyName: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Data Fetching ────────────────────────────────────────────────────────
  const fetchComplaints = useCallback(() => {
    api.get<{ data: Complaint[] }>("/complaints")
      .then((res) => setComplaints(res.data || []))
      .catch(() => setError("Failed to load complaints"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  useEffect(() => {
    api.get<Array<{ id: string; fullName: string; role: string; phone: string; openTicketCount: number }>>("/staff/list")
      .then((res) => setStaffList(res || []))
      .catch(() => {});
  }, []);

  const openDetail = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowAssignDropdown(false);
    setDetailLoading(true);
    try {
      const detail = await api.get<Complaint>(`/complaints/${complaint.id}`);
      setSelectedComplaint({ ...complaint, ...detail, comments: (detail as any).comments || [] });
    } catch {
      setSelectedComplaint(complaint);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/complaints/${id}/status`, { status });
      fetchComplaints();
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) => prev ? { ...prev, status } : null);
      }
    } catch {}
  };

  const assignTicket = async (id: string, staffId: string) => {
    try {
      await api.patch(`/complaints/${id}/status`, { status: "in_progress", assignedTo: staffId });
      fetchComplaints();
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) => prev ? { ...prev, status: "in_progress", assignedTo: staffId } : null);
      }
      setShowAssignDropdown(false);
    } catch {}
  };

  const submitComment = async () => {
    if (!selectedComplaint || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await api.post<Comment>(`/complaints/${selectedComplaint.id}/comments`, {
        comment: newComment,
        isInternal: isInternalNote,
      });
      setSelectedComplaint((prev) => prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null);
      setNewComment("");
      setIsInternalNote(false);
    } catch {}
    setSubmittingComment(false);
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) { setCreateError("Title is required"); return; }
    setCreating(true);
    setCreateError(null);
    try {
      await api.post("/complaints", {
        category: createForm.category,
        priority: createForm.priority,
        title: createForm.title,
        description: createForm.description,
        tenantName: createForm.tenantName || undefined,
        roomNumber: createForm.roomNumber || undefined,
        propertyName: createForm.propertyName || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ category: "plumbing", priority: "medium", title: "", description: "", tenantName: "", roomNumber: "", propertyName: "" });
      fetchComplaints();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  // ── Filtered & Stats ─────────────────────────────────────────────────────
  const filtered = complaints.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.tenantName?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchPriority = priorityFilter === "all" || c.priority === priorityFilter;
    const matchCategory = categoryFilter === "all" || c.category === categoryFilter;
    return matchSearch && matchStatus && matchPriority && matchCategory;
  });

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === "open").length,
    inProgress: complaints.filter((c) => c.status === "in_progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    breached: complaints.filter((c) => {
      const sla = getSLAInfo(c.createdAt, c.priority);
      return sla.status === "breached" && c.status !== "resolved" && c.status !== "closed";
    }).length,
  };

  const uniqueCategories = [...new Set(complaints.map((c) => c.category))].sort();

  // ── Error State ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Service Desk" description="Manage issues and track resolution" icon={AlertTriangle} />
        <EmptyState icon={AlertTriangle} title="Failed to load complaints" description={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Service Desk"
        description="Manage issues, track resolution, and maintain SLA compliance"
        icon={AlertTriangle}
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" /> Create Ticket
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard title="Total" value={stats.total} icon={BarChart3} iconColor="text-ink bg-canvas" />
        <StatCard title="New" value={stats.open} icon={Circle} iconColor="text-blue-600 bg-blue-50" />
        <StatCard title="In Progress" value={stats.inProgress} icon={Clock} iconColor="text-amber-600 bg-amber-50" />
        <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle2} iconColor="text-green-600 bg-green-50" />
        <StatCard title="SLA Breached" value={stats.breached} icon={AlertCircle} iconColor="text-red-600 bg-red-50" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search tickets, tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
          <option value="all">All Status</option>
          {statusWorkflow.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
          <option value="all">All Priority</option>
          {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
          <option value="all">All Category</option>
          {uniqueCategories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="flex gap-6">
        {/* ── Ticket List ──────────────────────────────────────────────────── */}
        <div className={cn("flex-1 min-w-0", selectedComplaint ? "hidden lg:block lg:max-w-[480px]" : "")}>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-surface border border-border animate-shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No tickets found" description="No complaints match your filters" />
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const pc = priorityConfig[c.priority] || priorityConfig.medium;
                const sla = getSLAInfo(c.createdAt, c.priority);
                const isActive = selectedComplaint?.id === c.id;
                const isOpen = c.status === "open" || c.status === "in_progress";

                return (
                  <button
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className={cn(
                      "w-full text-left bg-surface rounded-xl border p-4 hover:shadow-sm transition-all",
                      isActive ? "border-accent ring-1 ring-accent/20" : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">{categoryIcons[c.category] || "📋"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-ink-muted">{c.ticketNumber}</span>
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", pc.bg, pc.color)}>
                            {c.priority.toUpperCase()}
                          </span>
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", getStatusColor(c.status))}>
                            {c.status.replace(/_/g, " ")}
                          </span>
                          {isOpen && (
                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1", slaColors[sla.status])}>
                              <Timer className="w-3 h-3" />
                              {sla.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-ink truncate">{c.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted">
                          {c.tenantName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{c.tenantName}</span>}
                          {c.roomNumber && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Room {c.roomNumber}</span>}
                          <span className="ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(c.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-muted flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Detail Panel ─────────────────────────────────────────────────── */}
        {selectedComplaint && (
          <div className="flex-1 min-w-0 bg-surface rounded-xl border border-border overflow-hidden">
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <p className="text-xs text-ink-muted">Loading ticket details...</p>
              </div>
            ) : (
              <div className="flex flex-col h-[calc(100vh-220px)]">
                {/* Header */}
                <div className="p-5 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-ink-muted">{selectedComplaint.ticketNumber}</span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", (priorityConfig[selectedComplaint.priority] || priorityConfig.medium).bg)}>
                        {selectedComplaint.priority?.toUpperCase()}
                      </span>
                      {selectedComplaint.status !== "resolved" && selectedComplaint.status !== "closed" && (
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1", slaColors[getSLAInfo(selectedComplaint.createdAt, selectedComplaint.priority).status])}>
                          <Timer className="w-3 h-3" />
                          {getSLAInfo(selectedComplaint.createdAt, selectedComplaint.priority).label}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setSelectedComplaint(null)} className="p-1.5 rounded-lg hover:bg-canvas transition-colors">
                      <X className="w-5 h-5 text-ink-muted" />
                    </button>
                  </div>
                  <h2 className="text-lg font-bold text-ink">{selectedComplaint.title}</h2>
                  <p className="text-sm text-ink-secondary mt-1">{selectedComplaint.description}</p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Tenant Mapping */}
                  <div className="bg-canvas rounded-lg border border-border-subtle p-4">
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Reported By</h4>
                    <div className="flex items-center gap-3">
                      <Avatar name={selectedComplaint.tenantName || "Unknown"} size="md" />
                      <div>
                        <p className="text-sm font-medium text-ink">{selectedComplaint.tenantName || "Unknown"}</p>
                        <div className="flex items-center gap-2 text-xs text-ink-muted">
                          {selectedComplaint.roomNumber && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Room {selectedComplaint.roomNumber}</span>}
                          {selectedComplaint.propertyName && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{selectedComplaint.propertyName}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Workflow */}
                  <div>
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Status</h4>
                    <div className="flex items-center gap-1">
                      {statusWorkflow.map((s, i) => {
                        const currentIdx = statusWorkflow.findIndex((sw) => sw.key === selectedComplaint.status);
                        const thisIdx = statusWorkflow.findIndex((sw) => sw.key === s.key);
                        const isCurrent = s.key === selectedComplaint.status;
                        const isPast = thisIdx < currentIdx;
                        return (
                          <div key={s.key} className="flex items-center">
                            <button
                              onClick={() => updateStatus(selectedComplaint.id, s.key)}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                                isCurrent ? s.color + " border" : isPast ? "bg-green-50 text-green-600 border border-green-200" : "bg-canvas text-ink-muted border border-border-subtle hover:bg-surface"
                              )}
                            >
                              <s.icon className="w-3.5 h-3.5" />
                              {s.label}
                            </button>
                            {i < statusWorkflow.length - 1 && <ArrowRight className="w-3 h-3 text-ink-muted mx-1" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assignment */}
                  <div>
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Assigned To</h4>
                    <div className="relative">
                      {selectedComplaint.assignedTo ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar name={staffList.find((s) => s.id === selectedComplaint.assignedTo)?.fullName || "Staff"} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-ink">{staffList.find((s) => s.id === selectedComplaint.assignedTo)?.fullName || "Staff Member"}</p>
                              <p className="text-xs text-ink-muted">{staffList.find((s) => s.id === selectedComplaint.assignedTo)?.role || "Staff"}</p>
                            </div>
                          </div>
                          <button onClick={() => setShowAssignDropdown(!showAssignDropdown)} className="text-xs text-accent hover:text-accent-dark font-medium">
                            Reassign
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-sm text-ink-muted hover:text-accent"
                        >
                          <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Select staff member</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      )}

                      {showAssignDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-xl border border-border shadow-lg z-10 max-h-64 overflow-y-auto">
                          {staffList.length === 0 ? (
                            <div className="p-4 text-center text-xs text-ink-muted">No staff members found</div>
                          ) : (
                            staffList.map((staff) => (
                              <button
                                key={staff.id}
                                onClick={() => assignTicket(selectedComplaint.id, staff.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas transition-colors text-left"
                              >
                                <Avatar name={staff.fullName} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-ink truncate">{staff.fullName}</p>
                                  <p className="text-xs text-ink-muted">{staff.role} · {staff.phone}</p>
                                </div>
                                <span className="text-xs text-ink-muted bg-canvas px-2 py-0.5 rounded-full">{staff.openTicketCount} open</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div>
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Activity Timeline</h4>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Plus className="w-3 h-3 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-ink-secondary">Ticket created</p>
                          <p className="text-[11px] text-ink-muted">{formatDateTime(selectedComplaint.createdAt)}</p>
                        </div>
                      </div>

                      {selectedComplaint.assignedTo && (
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <User className="w-3 h-3 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs text-ink-secondary">Assigned to staff</p>
                            <p className="text-[11px] text-ink-muted">{formatDateTime(selectedComplaint.assignedAt || selectedComplaint.createdAt)}</p>
                          </div>
                        </div>
                      )}

                      {selectedComplaint.resolvedAt && (
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-ink-secondary">Resolved</p>
                            {selectedComplaint.resolutionNotes && <p className="text-xs text-ink mt-1">{selectedComplaint.resolutionNotes}</p>}
                            <p className="text-[11px] text-ink-muted">{formatDateTime(selectedComplaint.resolvedAt)}</p>
                          </div>
                        </div>
                      )}

                      {/* Rating */}
                      {selectedComplaint.tenantRating && (
                        <div className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Shield className="w-3 h-3 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-ink-secondary">Tenant rated {selectedComplaint.tenantRating}/5</p>
                            {selectedComplaint.tenantFeedback && <p className="text-xs text-ink mt-1">{selectedComplaint.tenantFeedback}</p>}
                          </div>
                        </div>
                      )}

                      {/* Comments */}
                      {(selectedComplaint.comments || []).map((c) => (
                        <div key={c.id} className="flex gap-3">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", c.isInternal ? "bg-amber-100" : "bg-accent/10")}>
                            {c.isInternal ? <EyeOff className="w-3 h-3 text-amber-600" /> : <MessageSquare className="w-3 h-3 text-accent" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-ink">{c.authorName || "Staff"}</span>
                              {c.isInternal && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
                                  <EyeOff className="w-2.5 h-2.5" /> Internal Note
                                </span>
                              )}
                              <span className="text-[11px] text-ink-muted">{timeAgo(c.createdAt)}</span>
                            </div>
                            <p className="text-sm text-ink mt-1">{c.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setIsInternalNote(!isInternalNote)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        isInternalNote
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-canvas text-ink-muted border border-border hover:bg-surface"
                      )}
                    >
                      {isInternalNote ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {isInternalNote ? "Internal Note" : "Public Comment"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitComment()}
                      placeholder={isInternalNote ? "Add an internal note (only visible to staff)..." : "Add a comment..."}
                      className="flex-1 h-9 px-3 rounded-lg border border-border bg-canvas text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                    <button
                      onClick={submitComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="h-9 px-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-50 transition-colors"
                    >
                      {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Ticket Modal ────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !creating && setShowCreateModal(false)} />
          <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface p-5 border-b border-border rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-ink">Create Ticket</h2>
                    <p className="text-xs text-ink-muted">Report a new issue or complaint</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-canvas transition-colors">
                  <X className="w-5 h-5 text-ink-muted" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {createError && <div className="p-3 rounded-lg bg-danger-light border border-danger/20 text-sm text-danger">{createError}</div>}

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Category *</label>
                  <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    {categories.map((c) => <option key={c} value={c}>{categoryIcons[c]} {c.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Priority *</label>
                  <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })} className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Title *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Detailed description of the issue..."
                  rows={3}
                  className="w-full px-3 py-2.5 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                />
              </div>

              {/* Optional Fields */}
              <div className="bg-canvas rounded-lg border border-border-subtle p-4 space-y-3">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Additional Info (optional)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-ink-muted">Tenant Name</label>
                    <input type="text" value={createForm.tenantName} onChange={(e) => setCreateForm({ ...createForm, tenantName: e.target.value })} placeholder="Name" className="w-full h-9 px-3 mt-1 rounded-lg border border-border bg-surface text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted">Room</label>
                    <input type="text" value={createForm.roomNumber} onChange={(e) => setCreateForm({ ...createForm, roomNumber: e.target.value })} placeholder="Room #" className="w-full h-9 px-3 mt-1 rounded-lg border border-border bg-surface text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted">Property</label>
                    <input type="text" value={createForm.propertyName} onChange={(e) => setCreateForm({ ...createForm, propertyName: e.target.value })} placeholder="Property" className="w-full h-9 px-3 mt-1 rounded-lg border border-border bg-surface text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                </div>
              </div>

              {/* SLA Info */}
              <div className="p-3 rounded-lg bg-info-light border border-info/20 text-xs text-info flex items-center gap-2">
                <Timer className="w-4 h-4 flex-shrink-0" />
                <span>
                  SLA: <strong>{SLA_HOURS[createForm.priority]}h</strong> resolution target for {createForm.priority} priority tickets.
                </span>
              </div>
            </div>

            <div className="sticky bottom-0 bg-surface p-5 border-t border-border rounded-b-2xl flex items-center justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} disabled={creating} className="px-4 py-2.5 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.title.trim()}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                  creating || !createForm.title.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-accent text-white hover:bg-accent-dark active:scale-[0.98]"
                )}
              >
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Check className="w-4 h-4" /> Create Ticket</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
