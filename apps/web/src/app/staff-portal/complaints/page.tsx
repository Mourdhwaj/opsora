"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn, formatDateTime, getStatusColor, getInitials } from "@/lib/utils";
import {
  Clock, CheckCircle2, MessageSquare, User, MapPin, AlertTriangle,
  ChevronDown, ChevronUp, Send, ArrowRight
} from "lucide-react";

interface Complaint {
  id: string;
  ticketNumber: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string;
  assignedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  tenantName?: string;
  roomNumber?: string;
  propertyName?: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

interface Comment {
  id: string;
  comment: string;
  isInternal?: boolean;
  createdAt: string;
  authorName?: string;
}

const statusWorkflow = [
  { key: "open", label: "New", icon: AlertTriangle, color: "text-blue-600 bg-blue-50" },
  { key: "in_progress", label: "In Progress", icon: Clock, color: "text-amber-600 bg-amber-50" },
  { key: "resolved", label: "Resolved", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
  { key: "closed", label: "Closed", icon: CheckCircle2, color: "text-slate-500 bg-slate-50" },
];

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgent", color: "text-red-700", bg: "bg-red-100 border-red-200" },
  high: { label: "High", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
  low: { label: "Low", color: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
};

const categoryIcons: Record<string, string> = {
  plumbing: "🔧", electrical: "⚡", cleaning: "🧹", maintenance: "🛠️",
  pest_control: "🐛", wifi: "📶", food: "🍽️", security: "🔒", noise: "🔊", other: "📋",
};

export default function StaffComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolve, setShowResolve] = useState(false);

  const fetchComplaints = () => {
    api.get<{ data: Complaint[] }>("/complaints")
      .then((res) => setComplaints(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchComplaints(); }, []);

  const openDetail = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
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

  const acceptTicket = async (id: string) => {
    try {
      await api.patch(`/complaints/${id}/status`, { status: "in_progress", assignedTo: "current-staff" });
      fetchComplaints();
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) => prev ? { ...prev, status: "in_progress" } : null);
      }
    } catch {}
  };

  const resolveTicket = async () => {
    if (!selectedComplaint) return;
    try {
      await api.patch(`/complaints/${selectedComplaint.id}/status`, {
        status: "resolved",
        resolutionNotes: resolutionNotes || undefined,
      });
      setShowResolve(false);
      setResolutionNotes("");
      fetchComplaints();
      setSelectedComplaint((prev) => prev ? { ...prev, status: "resolved", resolutionNotes } : null);
    } catch {}
  };

  const submitComment = async () => {
    if (!selectedComplaint || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await api.post<Comment>(`/complaints/${selectedComplaint.id}/comments`, {
        comment: newComment,
        isInternal,
      });
      setSelectedComplaint((prev) => prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null);
      setNewComment("");
      setIsInternal(false);
    } catch {}
    setSubmittingComment(false);
  };

  const openTickets = complaints.filter((c) => c.status === "open");
  const myTickets = complaints.filter((c) => c.status === "in_progress");
  const resolvedTickets = complaints.filter((c) => c.status === "resolved" || c.status === "closed");
  const currentStatusIdx = selectedComplaint ? statusWorkflow.findIndex((s) => s.key === selectedComplaint.status) : -1;

  const allTickets = [...openTickets, ...myTickets, ...resolvedTickets];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Complaints</h1>
        <p className="text-sm text-ink-secondary mt-1">Handle resident issues and track resolution</p>
      </div>

      <div className="flex gap-6">
        {/* Ticket List */}
        <div className={cn("flex-1 min-w-0", selectedComplaint ? "hidden lg:block lg:max-w-[420px]" : "")}>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{openTickets.length}</p>
              <p className="text-xs text-blue-600 font-medium">New</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{myTickets.length}</p>
              <p className="text-xs text-amber-600 font-medium">In Progress</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{resolvedTickets.length}</p>
              <p className="text-xs text-green-600 font-medium">Resolved</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-surface border border-border animate-shimmer" />
              ))}
            </div>
          ) : allTickets.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-12 text-center text-sm text-ink-muted">
              No complaints to handle
            </div>
          ) : (
            <div className="space-y-4">
              {/* New Tickets */}
              {openTickets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">New Tickets ({openTickets.length})</p>
                  <div className="space-y-2">
                    {openTickets.map((c) => (
                      <TicketRow key={c.id} complaint={c} selected={selectedComplaint?.id === c.id} onClick={() => openDetail(c)} onAccept={() => acceptTicket(c.id)} showAccept />
                    ))}
                  </div>
                </div>
              )}

              {/* In Progress */}
              {myTickets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">In Progress ({myTickets.length})</p>
                  <div className="space-y-2">
                    {myTickets.map((c) => (
                      <TicketRow key={c.id} complaint={c} selected={selectedComplaint?.id === c.id} onClick={() => openDetail(c)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved */}
              {resolvedTickets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Resolved ({resolvedTickets.length})</p>
                  <div className="space-y-2">
                    {resolvedTickets.map((c) => (
                      <TicketRow key={c.id} complaint={c} selected={selectedComplaint?.id === c.id} onClick={() => openDetail(c)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedComplaint && (
          <div className="flex-1 min-w-0 bg-surface rounded-xl border border-border overflow-hidden">
            {detailLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col h-[calc(100vh-220px)]">
                {/* Header */}
                <div className="p-5 border-b border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-ink-muted">{selectedComplaint.ticketNumber}</span>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", (priorityConfig[selectedComplaint.priority] || priorityConfig.medium).bg)}>
                      {selectedComplaint.priority?.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-ink">{selectedComplaint.title}</h2>
                  <p className="text-sm text-ink-secondary mt-1">{selectedComplaint.description}</p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Tenant Info */}
                  <div className="bg-canvas rounded-lg border border-border-subtle p-4">
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Reported By</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                        {getInitials(selectedComplaint.tenantName || "Unknown")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{selectedComplaint.tenantName || "Unknown"}</p>
                        <div className="flex items-center gap-2 text-xs text-ink-muted">
                          {selectedComplaint.roomNumber && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Room {selectedComplaint.roomNumber}</span>}
                          {selectedComplaint.propertyName && <span>{selectedComplaint.propertyName}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Status</h4>
                    <div className="flex items-center gap-1 flex-wrap">
                      {statusWorkflow.map((s, i) => {
                        const isCurrent = s.key === selectedComplaint.status;
                        const isPast = i < currentStatusIdx;
                        return (
                          <div key={s.key} className="flex items-center">
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium",
                              isCurrent ? s.color : isPast ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"
                            )}>
                              <s.icon className="w-3 h-3" />
                              {s.label}
                            </div>
                            {i < statusWorkflow.length - 1 && <ArrowRight className="w-3 h-3 text-ink-muted mx-1" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedComplaint.status === "in_progress" && !showResolve && (
                    <button
                      onClick={() => setShowResolve(true)}
                      className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                    </button>
                  )}

                  {showResolve && (
                    <div className="bg-green-50 rounded-lg border border-green-200 p-4 space-y-3">
                      <p className="text-sm font-semibold text-green-800">Resolution Notes</p>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Describe how the issue was resolved..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-green-200 bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowResolve(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm text-ink-secondary hover:bg-surface">Cancel</button>
                        <button onClick={resolveTicket} className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">Confirm Resolution</button>
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Activity</h4>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertTriangle className="w-2.5 h-2.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-ink-secondary">Ticket created</p>
                          <p className="text-[11px] text-ink-muted">{formatDateTime(selectedComplaint.createdAt)}</p>
                        </div>
                      </div>
                      {(selectedComplaint.comments || []).map((c) => (
                        <div key={c.id} className="flex gap-3">
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", c.isInternal ? "bg-amber-100" : "bg-accent/10")}>
                            <MessageSquare className={cn("w-2.5 h-2.5", c.isInternal ? "text-amber-600" : "text-accent")} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-ink">{c.authorName || "Staff"}</span>
                              {c.isInternal && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Internal</span>}
                              <span className="text-[11px] text-ink-muted">{formatDateTime(c.createdAt)}</span>
                            </div>
                            <p className="text-sm text-ink mt-0.5">{c.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t border-border space-y-2">
                  <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                    <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded border-border" />
                    Internal note (not visible to tenant)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitComment()}
                      placeholder={isInternal ? "Add internal note..." : "Reply to tenant..."}
                      className="flex-1 h-9 px-3 rounded-lg border border-border bg-canvas text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <button
                      onClick={submitComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="h-9 px-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketRow({ complaint, selected, onClick, onAccept, showAccept }: {
  complaint: Complaint;
  selected: boolean;
  onClick: () => void;
  onAccept?: () => void;
  showAccept?: boolean;
}) {
  const pc = priorityConfig[complaint.priority] || priorityConfig.medium;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-surface rounded-xl border p-3.5 hover:shadow-sm transition-all",
        selected ? "border-accent ring-1 ring-accent/20" : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-base mt-0.5">{categoryIcons[complaint.category] || "📋"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-ink-muted">{complaint.ticketNumber}</span>
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", pc.bg, pc.color)}>
              {complaint.priority.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-semibold text-ink truncate">{complaint.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-ink-muted">
            {complaint.tenantName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{complaint.tenantName}</span>}
            {complaint.roomNumber && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Rm {complaint.roomNumber}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {showAccept && (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept?.(); }}
              className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-dark transition-colors"
            >
              Accept
            </button>
          )}
          <span className="text-[11px] text-ink-muted">{formatDateTime(complaint.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}
