"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn, formatDateTime, getStatusColor } from "@/lib/utils";
import {
  Plus, X, Send, Clock, CheckCircle2, MessageSquare,
  Star, ChevronDown, ChevronUp, AlertTriangle, MapPin
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
  resolvedAt?: string;
  resolutionNotes?: string;
  tenantRating?: number;
  tenantFeedback?: string;
  roomNumber?: string;
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

const categories = [
  { value: "plumbing", label: "Plumbing", icon: "🔧" },
  { value: "electrical", label: "Electrical", icon: "⚡" },
  { value: "cleaning", label: "Cleaning", icon: "🧹" },
  { value: "maintenance", label: "Maintenance", icon: "🛠️" },
  { value: "pest_control", label: "Pest Control", icon: "🐛" },
  { value: "wifi", label: "WiFi / Internet", icon: "📶" },
  { value: "food", label: "Food & Mess", icon: "🍽️" },
  { value: "security", label: "Security", icon: "🔒" },
  { value: "noise", label: "Noise", icon: "🔊" },
  { value: "other", label: "Other", icon: "📋" },
];

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

export default function TenantComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Create form state
  const [formCategory, setFormCategory] = useState("plumbing");
  const [formPriority, setFormPriority] = useState("medium");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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

  const submitComment = async () => {
    if (!selectedComplaint || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await api.post<Comment>(`/complaints/${selectedComplaint.id}/comments`, { comment: newComment });
      setSelectedComplaint((prev) => prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null);
      setNewComment("");
    } catch {}
    setSubmittingComment(false);
  };

  const submitRating = async () => {
    if (!selectedComplaint || rating === 0) return;
    setSubmittingRating(true);
    try {
      await api.post(`/complaints/${selectedComplaint.id}/rate`, { rating, feedback });
      setSelectedComplaint((prev) => prev ? { ...prev, tenantRating: rating, tenantFeedback: feedback } : null);
      setShowRating(false);
      setRating(0);
      setFeedback("");
    } catch {}
    setSubmittingRating(false);
  };

  const createComplaint = async () => {
    if (!formTitle.trim() || !formDescription.trim()) {
      setFormError("Please fill in all fields");
      return;
    }
    setFormSubmitting(true);
    setFormError("");
    try {
      await api.post("/complaints", {
        propertyId: "162dbe90-3934-4a4-a082-fef8b69e07f5",
        category: formCategory,
        priority: formPriority,
        title: formTitle,
        description: formDescription,
      });
      setShowCreate(false);
      setFormTitle("");
      setFormDescription("");
      fetchComplaints();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create ticket");
    }
    setFormSubmitting(false);
  };

  const currentStatusIdx = selectedComplaint ? statusWorkflow.findIndex((s) => s.key === selectedComplaint.status) : -1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Complaints</h1>
          <p className="text-sm text-ink-secondary mt-1">Track and manage your maintenance requests</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Complaint List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface border border-border animate-shimmer" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="text-ink-muted">No complaints yet</p>
          <p className="text-xs text-ink-muted mt-1">Tap &quot;New Ticket&quot; to report an issue</p>
        </div>
      ) : (
        <div className="space-y-2">
          {complaints.map((c) => {
            const pc = priorityConfig[c.priority] || priorityConfig.medium;
            const isOpen = selectedComplaint?.id === c.id;
            return (
              <div key={c.id}>
                <button
                  onClick={() => isOpen ? setSelectedComplaint(null) : openDetail(c)}
                  className={cn(
                    "w-full text-left bg-surface rounded-xl border p-4 hover:shadow-sm transition-all",
                    isOpen ? "border-accent ring-1 ring-accent/20" : "border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-ink-muted">{c.ticketNumber}</span>
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", pc.bg, pc.color)}>
                          {c.priority.toUpperCase()}
                        </span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", getStatusColor(c.status))}>
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-ink">{c.title}</p>
                      <p className="text-xs text-ink-muted mt-1 line-clamp-1">{c.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted">
                        {c.roomNumber && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Room {c.roomNumber}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(c.createdAt)}</span>
                        {c.tenantRating && (
                          <span className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: c.tenantRating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500" />)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isOpen && (
                  <div className="bg-canvas rounded-b-xl border border-t-0 border-border p-4 space-y-4">
                    {detailLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : selectedComplaint ? (
                      <>
                        {/* Status Progress */}
                        <div className="flex items-center gap-1">
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
                                {i < statusWorkflow.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
                              </div>
                            );
                          })}
                        </div>

                        {/* Resolution Info */}
                        {selectedComplaint.resolutionNotes && (
                          <div className="bg-green-50 rounded-lg border border-green-200 p-3">
                            <p className="text-xs font-semibold text-green-700 mb-1">Resolution Notes</p>
                            <p className="text-sm text-green-800">{selectedComplaint.resolutionNotes}</p>
                          </div>
                        )}

                        {/* Rate Button for Resolved */}
                        {selectedComplaint.status === "resolved" && !selectedComplaint.tenantRating && !showRating && (
                          <button
                            onClick={() => setShowRating(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
                          >
                            <Star className="w-4 h-4" /> Rate this resolution
                          </button>
                        )}

                        {/* Rating Form */}
                        {showRating && (
                          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 space-y-3">
                            <p className="text-sm font-semibold text-amber-800">How was the resolution?</p>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button key={s} onClick={() => setRating(s)} className="p-1">
                                  <Star className={cn("w-6 h-6 transition-colors", s <= rating ? "text-amber-500 fill-amber-500" : "text-amber-200")} />
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Optional feedback..."
                              className="w-full h-16 px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => setShowRating(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm text-ink-secondary hover:bg-surface">Cancel</button>
                              <button onClick={submitRating} disabled={submittingRating || rating === 0} className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-50">
                                {submittingRating ? "Submitting..." : "Submit Rating"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Comments Timeline */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Activity</p>
                          <div className="flex gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Plus className="w-2.5 h-2.5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-ink-secondary">Ticket created</p>
                              <p className="text-[11px] text-ink-muted">{formatDateTime(selectedComplaint.createdAt)}</p>
                            </div>
                          </div>
                          {(selectedComplaint.comments || []).map((c) => (
                            <div key={c.id} className="flex gap-3">
                              <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <MessageSquare className="w-2.5 h-2.5 text-accent" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-ink">{c.authorName || "Staff"}</span>
                                  <span className="text-[11px] text-ink-muted">{formatDateTime(c.createdAt)}</span>
                                </div>
                                <p className="text-sm text-ink mt-0.5">{c.comment}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Comment Input */}
                        {selectedComplaint.status !== "closed" && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && submitComment()}
                              placeholder="Add a comment..."
                              className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                            <button
                              onClick={submitComment}
                              disabled={!newComment.trim() || submittingComment}
                              className="h-9 px-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">New Complaint</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-canvas transition-colors">
                <X className="w-5 h-5 text-ink-muted" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-danger-light border border-red-200 text-danger text-sm">{formError}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Category</label>
              <div className="grid grid-cols-5 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setFormCategory(cat.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all",
                      formCategory === cat.value ? "border-accent bg-accent/5 text-accent" : "border-border bg-canvas text-ink-secondary hover:border-ink-muted"
                    )}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate w-full text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Priority</label>
              <div className="flex gap-2">
                {Object.entries(priorityConfig).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setFormPriority(k)}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                      formPriority === k ? cn(v.bg, v.color, "border-current") : "border-border bg-canvas text-ink-secondary hover:border-ink-muted"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full h-10 px-3 rounded-lg border border-border bg-canvas text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Provide details about the issue..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-border bg-canvas text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-ink-secondary hover:bg-canvas transition-colors">Cancel</button>
              <button
                onClick={createComplaint}
                disabled={formSubmitting || !formTitle.trim() || !formDescription.trim()}
                className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark disabled:opacity-50 transition-colors"
              >
                {formSubmitting ? "Creating..." : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
