"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency, getInitials } from "@/lib/utils";
import {
  Search, ArrowLeft, ChevronRight, X, Phone, Mail, Calendar, User,
  CreditCard, BedDouble, Home, Shield, Briefcase, Heart, Hash, MapPin, UserPlus, LogOut, AlertTriangle, CheckCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Interfaces ──────────────────────────────────────────────────────────────
interface Resident {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  occupation?: string;
  companyName?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  moveInDate: string;
  roomNumber?: string;
  bedNumber?: string;
  rentAmount: number;
  depositPaid: number;
  status: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
}

interface TenantDetail {
  profile: Resident;
  room: {
    id: string;
    roomNumber: string;
    roomType: string;
    rentPerBed: number;
  } | null;
  bed: {
    id: string;
    bedNumber: string;
    rentAmount: number;
  } | null;
  property: {
    id: string;
    name: string;
    address: string;
  } | null;
  paymentHistory: PaymentRecord[];
  paymentSummary: {
    totalDue: number;
    totalPaid: number;
    totalBalance: number;
    paidCount: number;
    pendingCount: number;
    partialCount: number;
    totalPayments: number;
  };
  recentComplaints: Complaint[];
}

interface PaymentRecord {
  id: string;
  monthYear: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  transactionId?: string;
}

interface Complaint {
  id: string;
  ticketNumber: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

// ── Component ───────────────────────────────────────────────────────────────
interface PropertyOption {
  id: string;
  name: string;
}

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // Tenant detail
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{ success: boolean; message: string; depositRefund?: number } | null>(null);

  // Fetch properties for filter dropdown
  useEffect(() => {
    api.get<{ data: PropertyOption[] }>("/properties", { limit: "100" })
      .then((res) => setProperties(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch residents based on current filters and pagination
  const fetchResidents = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
      search,
      propertyId: propertyFilter,
    };
    if (statusFilter !== "all") {
      params.status = statusFilter;
    }
    api.get<{ data: Resident[]; pagination: { total: number } }>("/residents", params)
      .then((res) => {
        setResidents(res.data || []);
        setTotal(res.pagination?.total || 0);
      })
      .catch((err) => {
        setError("Failed to load residents: " + (err.message || String(err)));
      })
      .finally(() => setLoading(false));
  }, [page, limit, search, statusFilter, propertyFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, propertyFilter]);

  // Fetch data when pagination or filters change
  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  const fetchTenantDetail = useCallback(async (tenantId: string) => {
    setTenantLoading(true);
    setSelectedTenantId(tenantId);
    try {
      const detail = await api.get<TenantDetail>(`/residents/${tenantId}/details`);
      setTenantDetail(detail);
    } catch {
      setSelectedTenantId(null);
      setTenantDetail(null);
    } finally {
      setTenantLoading(false);
    }
  }, []);

  const closeDetail = () => {
    setSelectedTenantId(null);
    setTenantDetail(null);
    setShowCheckout(false);
    setCheckoutResult(null);
  };

  const handleCheckout = async () => {
    if (!selectedTenantId) return;
    setCheckoutLoading(true);
    setCheckoutResult(null);
    try {
      const res = await api.post<{ message: string; depositRefund?: number; checkoutDate?: string }>(
        `/residents/${selectedTenantId}/checkout`, {}
      );
      setCheckoutResult({ success: true, message: res.message, depositRefund: res.depositRefund });
      // Refresh the detail to show checked_out status
      const detail = await api.get<TenantDetail>(`/residents/${selectedTenantId}/details`);
      setTenantDetail(detail);
      await fetchResidents();
    } catch (err: any) {
      const msg = err?.message || String(err);
      setCheckoutResult({ success: false, message: msg });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatCurrencySafe = (amount: number): string => {
    return formatCurrency(amount);
  };

  const formatDateSafe = (dateString: string): string => {
    return formatDate(dateString);
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div><h1 className="text-2xl font-bold text-ink">Residents</h1></div>
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-ink-secondary">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const showDetail = !!selectedTenantId;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Residents</h1>
          <p className="text-sm text-ink-secondary mt-1">{total} residents total</p>
        </div>
        <button onClick={() => setShowCheckIn(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark active:scale-[0.98] transition-all">
          <UserPlus className="w-4 h-4" /> Add Resident
        </button>
      </div>

      {/* Filters */}
      {!showDetail && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input type="text" placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
          </div>
          <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="checked_out">Checked Out</option>
          </select>
        </div>
      )}

      {/* Breadcrumb */}
      {showDetail && (
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <button onClick={closeDetail} className="hover:text-ink transition-colors">All Residents</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-ink font-medium">{tenantDetail?.profile.fullName || "Loading..."}</span>
        </div>
      )}

      {/* Main content area: list + detail panel side by side */}
      <div className="flex gap-6">
        {/* ── Residents List ──────────────────────────────────────────────── */}
        <div className={cn("flex-1 min-w-0", showDetail ? "hidden lg:block lg:max-w-[480px]" : "")}>
          {/* Table - Desktop */}
          <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-canvas">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Resident</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Room</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Move-in</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Rent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {residents.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-ink-muted">No residents found</td></tr>
                ) : (
                  residents.map((r) => (
                    <tr key={r.id} onClick={() => fetchTenantDetail(r.id)} className={cn("transition-colors cursor-pointer", selectedTenantId === r.id ? "bg-accent/5" : "hover:bg-canvas/50")}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">{getInitials(r.fullName)}</div>
                          <div>
                            <p className="text-sm font-medium text-ink">{r.fullName}</p>
                            <p className="text-xs text-ink-muted">{r.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink">{r.roomNumber || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-ink-secondary">{formatDateSafe(r.moveInDate)}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-ink">{formatCurrencySafe(r.rentAmount)}</td>
                      <td className="px-5 py-3.5">
                        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", r.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200")}>{r.status.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="flex items-center gap-1 text-sm text-accent font-medium ml-auto">View <ChevronRight className="w-3.5 h-3.5" /></span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Cards - Mobile */}
          <div className="md:hidden space-y-3">
            {residents.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-8 text-center text-sm text-ink-muted">No residents found</div>
            ) : (
              residents.map((r) => (
                <button key={r.id} onClick={() => fetchTenantDetail(r.id)} className={cn("w-full text-left bg-surface rounded-xl border border-border p-4 transition-all hover:shadow-md", selectedTenantId === r.id && "ring-2 ring-accent border-accent")}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent">{getInitials(r.fullName)}</div>
                      <div>
                        <p className="text-sm font-medium text-ink">{r.fullName}</p>
                        <p className="text-xs text-ink-muted">{r.phone} · {r.roomNumber || "No room"}</p>
                      </div>
                    </div>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", r.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200")}>{r.status.replace(/_/g, " ")}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                    <span>Move-in: {formatDateSafe(r.moveInDate)}</span>
                    <span className="font-medium text-ink">{formatCurrencySafe(r.rentAmount)}/mo</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Tenant Detail Panel ──────────────────────────────────────────── */}
        {showDetail && (
          <div className="flex-1 min-w-0 bg-surface rounded-xl border border-border overflow-hidden">
            {tenantLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-ink-muted">Loading tenant details...</p>
              </div>
            ) : tenantDetail ? (
              <div className="flex flex-col h-[calc(100vh-220px)]">
                {/* Header */}
                <div className="p-5 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={closeDetail} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"><ArrowLeft className="w-3.5 h-3.5" /> Back to list</button>
                    <button onClick={closeDetail} className="p-1.5 rounded-lg hover:bg-canvas transition-colors"><X className="w-5 h-5 text-ink-muted" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-lg font-bold text-accent flex-shrink-0">{getInitials(tenantDetail.profile.fullName)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-ink truncate">{tenantDetail.profile.fullName}</h2>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", tenantDetail.profile.status === "active" ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200")}>{tenantDetail.profile.status}</span>
                      </div>
                      <p className="text-sm text-ink-secondary">{tenantDetail.room ? `Room ${tenantDetail.room.roomNumber}` : "No room"} · {tenantDetail.bed ? `Bed ${tenantDetail.bed.bedNumber}` : "No bed"}</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-canvas rounded-lg border border-border-subtle p-3"><div className="flex items-center gap-2 mb-1"><CreditCard className="w-3.5 h-3.5 text-ink-muted" /><span className="text-[10px] font-medium text-ink-muted uppercase">Monthly Rent</span></div><p className="text-lg font-bold text-ink">{formatCurrencySafe(tenantDetail.profile.rentAmount)}</p></div>
                    <div className="bg-canvas rounded-lg border border-border-subtle p-3"><div className="flex items-center gap-2 mb-1"><Shield className="w-3.5 h-3.5 text-ink-muted" /><span className="text-[10px] font-medium text-ink-muted uppercase">Deposit Paid</span></div><p className="text-lg font-bold text-ink">{formatCurrencySafe(tenantDetail.profile.depositPaid)}</p></div>
                    <div className={cn("rounded-lg border p-3", tenantDetail.paymentSummary.totalBalance > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}><p className="text-[10px] font-medium text-ink-muted uppercase mb-1">Balance Due</p><p className={cn("text-lg font-bold", tenantDetail.paymentSummary.totalBalance > 0 ? "text-red-700" : "text-green-700")}>{formatCurrencySafe(tenantDetail.paymentSummary.totalBalance)}</p></div>
                    <div className="bg-canvas rounded-lg border border-border-subtle p-3"><p className="text-[10px] font-medium text-ink-muted uppercase mb-1">Move-in Date</p><p className="text-sm font-semibold text-ink">{formatDateSafe(tenantDetail.profile.moveInDate)}</p></div>
                  </div>

                  {/* Payment Chart */}
                  {tenantDetail.paymentHistory.length > 1 && (
                    <div className="bg-canvas rounded-xl border border-border-subtle p-4">
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Payment Trend</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={tenantDetail.paymentHistory.map(p => ({ month: p.monthYear, due: p.totalAmount, paid: p.paidAmount }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }} formatter={(value) => [formatCurrencySafe(Number(value)), ""]} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="due" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Due" />
                          <Bar dataKey="paid" fill="#059669" radius={[4, 4, 0, 0]} name="Paid" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Checkout Action */}
                  {tenantDetail.profile.status === "active" && (
                    <div>
                      <button
                        onClick={() => { setShowCheckout(true); setCheckoutResult(null); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 active:scale-[0.98] transition-all"
                      >
                        <LogOut className="w-4 h-4" /> Checkout Resident
                      </button>
                    </div>
                  )}

                  {/* Personal Info */}
                  <div className="bg-canvas rounded-xl border border-border-subtle p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Personal Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {tenantDetail.profile.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.phone}</span></div>}
                      {tenantDetail.profile.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.email}</span></div>}
                      {tenantDetail.profile.gender && <div className="flex items-center gap-2"><span className="text-ink capitalize">{tenantDetail.profile.gender}</span></div>}
                      {tenantDetail.profile.dateOfBirth && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.dateOfBirth}</span></div>}
                      {tenantDetail.profile.occupation && <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.occupation}{tenantDetail.profile.companyName ? ` at ${tenantDetail.profile.companyName}` : ""}</span></div>}
                      {tenantDetail.profile.bloodGroup && <div className="flex items-center gap-2"><Heart className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.bloodGroup}</span></div>}
                    </div>
                    {(tenantDetail.profile.aadhaarNumber || tenantDetail.profile.panNumber) && (
                      <div className="pt-2 border-t border-border-subtle space-y-2">
                        {tenantDetail.profile.aadhaarNumber && <div className="flex items-center gap-2 text-xs"><Hash className="w-3 h-3 text-ink-muted" /><span className="text-ink-muted">Aadhaar:</span><span className="text-ink font-mono">{tenantDetail.profile.aadhaarNumber}</span></div>}
                        {tenantDetail.profile.panNumber && <div className="flex items-center gap-2 text-xs"><Hash className="w-3 h-3 text-ink-muted" /><span className="text-ink-muted">PAN:</span><span className="text-ink font-mono">{tenantDetail.profile.panNumber}</span></div>}
                      </div>
                    )}
                  </div>

                  {/* Accommodation */}
                  {(tenantDetail.room || tenantDetail.property) && (
                    <div className="bg-canvas rounded-xl border border-border-subtle p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Accommodation</h4>
                      <div className="space-y-2 text-sm">
                        {tenantDetail.property && <div className="flex items-center gap-2"><Home className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.property.name}</span></div>}
                        {tenantDetail.property?.address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-ink-muted mt-0.5" /><span className="text-ink-secondary text-xs">{tenantDetail.property.address}</span></div>}
                        {tenantDetail.room && <div className="flex items-center gap-2"><BedDouble className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">Room {tenantDetail.room.roomNumber} · {tenantDetail.room.roomType} · Bed {tenantDetail.bed?.bedNumber || "N/A"}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* Emergency */}
                  {(tenantDetail.profile.emergencyName || tenantDetail.profile.emergencyPhone) && (
                    <div className="bg-canvas rounded-xl border border-border-subtle p-4 space-y-2">
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Emergency Contact</h4>
                      <div className="text-sm space-y-1">
                        {tenantDetail.profile.emergencyName && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.emergencyName}</span>{tenantDetail.profile.emergencyRelation && <span className="text-xs text-ink-muted">({tenantDetail.profile.emergencyRelation})</span>}</div>}
                        {tenantDetail.profile.emergencyPhone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.emergencyPhone}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* Payment Summary */}
                  <div className="bg-canvas rounded-xl border border-border-subtle p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Payment Summary</h4>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-surface rounded-lg p-2"><p className="text-lg font-bold text-ink">{tenantDetail.paymentSummary.totalPayments}</p><p className="text-[10px] text-ink-muted uppercase">Total</p></div>
                      <div className="bg-green-50 rounded-lg p-2"><p className="text-lg font-bold text-green-700">{tenantDetail.paymentSummary.paidCount}</p><p className="text-[10px] text-green-600 uppercase">Paid</p></div>
                      <div className="bg-amber-50 rounded-lg p-2"><p className="text-lg font-bold text-amber-700">{tenantDetail.paymentSummary.partialCount}</p><p className="text-[10px] text-amber-600 uppercase">Partial</p></div>
                      <div className="bg-red-50 rounded-lg p-2"><p className="text-lg font-bold text-red-700">{tenantDetail.paymentSummary.pendingCount}</p><p className="text-[10px] text-red-600 uppercase">Pending</p></div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-ink-secondary">Total Due</span><span className="font-semibold text-ink">{formatCurrencySafe(tenantDetail.paymentSummary.totalDue)}</span></div>
                      <div className="flex justify-between"><span className="text-ink-secondary">Total Paid</span><span className="font-semibold text-green-700">{formatCurrencySafe(tenantDetail.paymentSummary.totalPaid)}</span></div>
                      {tenantDetail.paymentSummary.totalBalance > 0 && <div className="flex justify-between"><span className="text-ink-secondary">Balance</span><span className="font-semibold text-red-700">{formatCurrencySafe(tenantDetail.paymentSummary.totalBalance)}</span></div>}
                    </div>
                  </div>


                  {tenantDetail.recentComplaints.length > 0 && (
                    <div className="bg-canvas rounded-xl border border-border-subtle p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Recent Complaints</h4>
                      <div className="space-y-2">
                        {tenantDetail.recentComplaints.map((c) => (
                          <div key={c.id} className="p-3 bg-surface rounded-lg border border-border-subtle">
                            <div className="flex justify-between text-sm">
                              <span>{c.ticketNumber}</span>
                              <span className={cn("px-2 py-0.5 rounded-full text-xs", c.priority === "urgent" ? "bg-red-50 text-red-700" : c.priority === "high" ? "bg-amber-50 text-amber-700" : c.priority === "medium" ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700")}>{c.priority}</span>
                            </div>
                            <p className="text-xs text-ink-muted mb-1">{c.title}</p>
                            <div className="text-xs text-ink">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.createdAt?.slice(0, 10)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {/* End of flex gap-6 */}

      {/* ── Pagination Controls ──────────────────────────────────────────── */}
      {total > limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-sm text-ink-muted">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} residents
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="px-2.5 py-1.5 rounded-lg text-sm border border-border hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              « First
            </button>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1.5 rounded-lg text-sm border border-border hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ‹ Prev
            </button>
            {(() => {
              const totalPages = Math.ceil(total / limit);
              const pages: (number | '...')[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (page > 3) pages.push('...');
                for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                  pages.push(i);
                }
                if (page < totalPages - 2) pages.push('...');
                pages.push(totalPages);
              }
              return pages.map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-1.5 py-1.5 text-sm text-ink-muted">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "min-w-[36px] px-2 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      p === page
                        ? "bg-accent text-white border-accent"
                        : "border-border hover:bg-accent/10 text-ink"
                    )}
                  >
                    {p}
                  </button>
                )
              );
            })()}
            <button
              onClick={() => setPage(Math.min(Math.ceil(total / limit), page + 1))}
              disabled={page >= Math.ceil(total / limit) || total === 0}
              className="px-2.5 py-1.5 rounded-lg text-sm border border-border hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next ›
            </button>
            <button
              onClick={() => setPage(Math.ceil(total / limit))}
              disabled={page >= Math.ceil(total / limit) || total === 0}
              className="px-2.5 py-1.5 rounded-lg text-sm border border-border hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Last »
            </button>
          </div>
        </div>
      )}

      {/* ── Check-in Modal ──────────────────────────────────────────────── */}
      {showCheckIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCheckIn(false)} />
          <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-fade-in">
            <div className="p-5 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Check-in Resident</h2>
                <button onClick={() => setShowCheckIn(false)} className="p-1.5 rounded-lg hover:bg-canvas transition-colors"><X className="w-5 h-5 text-ink-muted" /></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                try {
                  await api.post("/residents", {
                    fullName: fd.get("fullName") as string,
                    phone: fd.get("phone") as string,
                    email: fd.get("email") as string || undefined,
                    moveInDate: fd.get("moveInDate") as string,
                    rentAmount: Number(fd.get("rentAmount")),
                    depositPaid: Number(fd.get("depositPaid")),
                    status: "active"
                  });
                  setShowCheckIn(false);
                  form.reset();
                  await fetchResidents();
                } catch (err: any) {
                  alert(`Error: ${err.message}`);
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Full Name *</label>
                    <input name="fullName" type="text" required placeholder="e.g. John Smith" className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Phone Number *</label>
                    <input name="phone" type="tel" required placeholder="e.g. 9876543210" className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Email</label>
                    <input name="email" type="email" placeholder="e.g. john@example.com" className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Move-in Date *</label>
                    <input name="moveInDate" type="date" required className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">Monthly Rent (₹) *</label>
                      <input name="rentAmount" type="number" required min="0" placeholder="e.g. 10000" className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">Security Deposit (₹) *</label>
                      <input name="depositPaid" type="number" required min="0" placeholder="e.g. 20000" className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <button type="button" onClick={() => setShowCheckIn(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-accent/10 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent-dark active:scale-[0.98] transition-all">
                      Check-in Resident
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
