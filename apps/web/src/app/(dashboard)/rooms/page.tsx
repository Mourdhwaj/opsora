"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BedDouble, User, X, Phone, Mail, Calendar, CreditCard, AlertCircle,
  CheckCircle2, ArrowLeft, ChevronRight,
  Shield, Briefcase, Heart, IndianRupee, Check,
  Plus, Search, Building2
} from "lucide-react";
import { CreateRoomModal } from "@/components/rooms/create-room-modal";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Interfaces ──────────────────────────────────────────────────────────────
interface Bed {
  id: string;
  bedNumber: string;
  status: string;
  rentAmount: number;
  currentTenantId?: string;
  tenantName?: string;
  tenantProfileId?: string;
}

interface RoomWithTenants {
  id: string;
  propertyId: string;
  floorId: string;
  roomNumber: string;
  roomType: string;
  sharingType: number;
  rentPerBed: number;
  depositAmount: number;
  status: string;
  gender?: string;
  beds: Bed[];
}

interface TenantProfile {
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
  passportNumber?: string;
  moveInDate: string;
  moveOutDate?: string;
  rentAmount: number;
  depositPaid: number;
  status: string;
  bedId: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  latestPayment?: {
    monthYear: string;
    rentAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: string;
    dueDate: string;
    paidDate?: string;
  } | null;
}

interface RoomDetail {
  id: string;
  roomNumber: string;
  roomType: string;
  rentPerBed: number;
  depositAmount: number;
  beds: Bed[];
  tenants: TenantProfile[];
}

interface PaymentRecord {
  id: string;
  monthYear: string;
  rentAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
}

interface ComplaintRecord {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface TenantDetail {
  profile: TenantProfile;
  room: { id: string; roomNumber: string; roomType: string; rentPerBed: number } | null;
  bed: { id: string; bedNumber: string; rentAmount: number } | null;
  property: { id: string; name: string; address: string } | null;
  paymentSummary: {
    totalDue: number;
    totalPaid: number;
    totalBalance: number;
    paidCount: number;
    pendingCount: number;
    partialCount: number;
    totalPayments: number;
  };
  paymentHistory: PaymentRecord[];
  recentComplaints: ComplaintRecord[];
}

// ── Component ───────────────────────────────────────────────────────────────
export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomWithTenants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([]);

  // Room detail
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Tenant detail
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);

  // Create room modal
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedFloorNumber, setSelectedFloorNumber] = useState(0);

  // Record payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payPayment, setPayPayment] = useState<PaymentRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payTxnId, setPayTxnId] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // ── Fetch properties for filter ──────────────────────────────────────────
  useEffect(() => {
    api.get<{ data: Array<{ id: string; name: string }> }>("/properties", { limit: "100" })
      .then((res) => setProperties(res.data || []))
      .catch(() => {});
  }, []);

  // ── Data fetching ───────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (propertyFilter) params.propertyId = propertyFilter;
    api.get<RoomWithTenants[] | { data: RoomWithTenants[] }>("/rooms/with-tenants", params)
      .then((res) => {
        const data = Array.isArray(res) ? res : (res as any)?.data || [];
        setRooms(data);
      })
      .catch(() => setError("Failed to load rooms"))
      .finally(() => setLoading(false));
  }, [propertyFilter]);

  const fetchRoomDetail = useCallback(async (roomId: string) => {
    if (selectedRoomId === roomId) { closeDetail(); return; }
    setDetailLoading(true);
    setSelectedRoomId(roomId);
    setSelectedTenantId(null);
    setTenantDetail(null);
    try {
      const detail = await api.get<RoomDetail>(`/rooms/${roomId}/details`);
      setRoomDetail(detail);
    } catch {
      setSelectedRoomId(null);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedRoomId]);

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
    setSelectedRoomId(null);
    setRoomDetail(null);
    setSelectedTenantId(null);
    setTenantDetail(null);
  };

  const closeTenantDetail = () => {
    setSelectedTenantId(null);
    setTenantDetail(null);
  };

  const openPayModal = (payment: PaymentRecord) => {
    setPayPayment(payment);
    setPayAmount(payment.balanceAmount > 0 ? payment.balanceAmount.toString() : payment.totalAmount.toString());
    setPayMethod("cash");
    setPayTxnId("");
    setPayError(null);
    setShowPayModal(true);
  };

  const handleRecordPayment = async () => {
    if (!payPayment || !payAmount) return;
    if (Number(payAmount) > payPayment.balanceAmount) {
      setPayError("Amount cannot exceed the balance due");
      return;
    }
    setPaySubmitting(true);
    setPayError(null);
    try {
      await api.post(`/payments/${payPayment.id}/pay`, {
        paidAmount: Number(payAmount),
        paymentMethod: payMethod,
        transactionId: payTxnId || undefined,
      });
      setShowPayModal(false);
      setPayPayment(null);
      if (selectedTenantId) {
        const detail = await api.get<TenantDetail>(`/residents/${selectedTenantId}/details`);
        setTenantDetail(detail);
      }
    } catch (err: any) {
      setPayError(err?.message || "Failed to record payment");
    } finally {
      setPaySubmitting(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const filtered = rooms.filter((r) => {
    const matchesFloor = floorFilter === "all" || parseInt(r.roomNumber.charAt(0)).toString() === floorFilter;
    const matchesSearch = search === "" || r.roomNumber.toLowerCase().includes(search.toLowerCase());
    return matchesFloor && matchesSearch;
  });

  const floors = [...new Set(rooms.map((r) => parseInt(r.roomNumber.charAt(0)).toString()))].sort();

  // Stats — calculated from bed arrays since denormalized columns were removed
  const totalBeds = rooms.reduce((sum, r) => sum + (r.beds?.length || 0), 0);
  const occupiedBeds = rooms.reduce((sum, r) => sum + (r.beds?.filter((b) => b.tenantName).length || 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Rooms & Beds" description="Manage rooms and bed allocations" icon={BedDouble} />
        <EmptyState icon={AlertCircle} title="Failed to load rooms" description={error} />
      </div>
    );
  }

  const showDetailPanel = selectedRoomId && !selectedTenantId;
  const showTenantPanel = selectedTenantId;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Rooms & Beds"
        description={`${rooms.length} rooms across ${floors.length} floors`}
        icon={BedDouble}
        action={
          <button
            onClick={() => {
              // Use the currently selected property filter if set
              if (propertyFilter) {
                setSelectedPropertyId(propertyFilter);
                const firstRoomInProperty = rooms.find(r => r.propertyId === propertyFilter);
                if (firstRoomInProperty) {
                  setSelectedFloorId(firstRoomInProperty.floorId);
                  setSelectedFloorNumber(parseInt(firstRoomInProperty.roomNumber.charAt(0)) || 1);
                } else {
                  setSelectedFloorId("");
                  setSelectedFloorNumber(1);
                }
              } else {
                const firstRoom = rooms[0];
                if (firstRoom) {
                  setSelectedPropertyId(firstRoom.propertyId);
                  setSelectedFloorId(firstRoom.floorId);
                  setSelectedFloorNumber(parseInt(firstRoom.roomNumber.charAt(0)) || 1);
                } else {
                  return;
                }
              }
              setShowCreateRoom(true);
            }}
            disabled={rooms.length === 0 && !propertyFilter}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              rooms.length === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-accent text-white hover:bg-accent-dark active:scale-[0.98]"
            )}
          >
            <Plus className="w-4 h-4" /> Add Room
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Rooms" value={rooms.length} icon={Building2} iconColor="text-info bg-info/10" />
        <StatCard title="Total Beds" value={totalBeds} icon={BedDouble} iconColor="text-accent bg-accent/10" />
        <StatCard title="Occupied" value={occupiedBeds} icon={User} iconColor="text-warning bg-warning/10" />
        <StatCard title="Occupancy" value={`${occupancyRate}%`} icon={CheckCircle2} iconColor="text-success bg-success/10" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          />
        </div>
        <select
          value={propertyFilter}
          onChange={(e) => { setPropertyFilter(e.target.value); setFloorFilter("all"); }}
          className="h-10 px-3 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {["all", ...floors].map((f) => (
            <button
              key={f}
              onClick={() => setFloorFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                floorFilter === f
                  ? "bg-accent text-white shadow-sm"
                  : "bg-surface border border-border text-ink-secondary hover:bg-canvas"
              )}
            >
              {f === "all" ? "All" : `Floor ${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> Vacant</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> Partial</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Full</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent border border-accent" /> Occupied</span>
      </div>



      <div>
        {/* ── Rooms Grid ────────────────────────────────────────────────── */}
        <div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-surface border border-border animate-shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={BedDouble} title="No rooms found" description="Add rooms to start managing bed allocations" />
          ) : (
            <div className="space-y-6">
              {floors.filter((f) => floorFilter === "all" || f === floorFilter).map((floor) => (
                <div key={floor}>
                  <h3 className="text-sm font-semibold text-ink mb-3">Floor {floor}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filtered.filter((r) => parseInt(r.roomNumber.charAt(0)).toString() === floor).map((room) => {
                    // First room in floor gives us the floorId for create modal
                      const isActive = selectedRoomId === room.id;
                      const roomTotalBeds = room.beds?.length || 0;
                      const roomOccupiedBeds = room.beds?.filter((b) => b.tenantName).length || 0;
                      const occupancy = roomTotalBeds > 0 ? Math.round((roomOccupiedBeds / roomTotalBeds) * 100) : 0;
                      return (
                        <button
                          key={room.id}
                          onClick={() => fetchRoomDetail(room.id)}
                          className={cn(
                            "rounded-xl border p-4 hover:shadow-md transition-all text-left bg-surface",
                            isActive ? "ring-2 ring-accent border-accent" : "border-border hover:border-accent/30"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-lg font-bold text-ink">{room.roomNumber}</span>
                            <Badge variant={roomOccupiedBeds === roomTotalBeds ? "danger" : roomOccupiedBeds > 0 ? "warning" : "success"}>
                              {roomOccupiedBeds}/{roomTotalBeds}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-3">
                            {room.beds && room.beds.length > 0 ? room.beds.map((bed) => (
                              <div
                                key={bed.id}
                                className={cn(
                                  "w-6 h-6 rounded flex items-center justify-center",
                                  bed.tenantName ? "bg-accent text-white" : "bg-white border border-border text-ink-muted"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (bed.tenantName && bed.tenantProfileId) fetchTenantDetail(bed.tenantProfileId);
                                }}
                              >
                                <BedDouble className="w-3 h-3" />
                              </div>
                            )) : (
                              <div className="flex gap-1">
                                {Array.from({ length: roomTotalBeds }, (_, i) => (
                                  <div key={i} className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center",
                                    i < roomOccupiedBeds ? "bg-accent text-white" : "bg-white border border-border text-ink-muted"
                                  )}>
                                    <BedDouble className="w-3 h-3" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-ink-muted capitalize">{room.roomType}</span>
                            <span className="font-medium text-ink">{formatCurrency(room.rentPerBed)}/mo</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Room Detail Modal ──────────────────────────────────────────── */}
      {showDetailPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in">
            <div className="p-5 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <button onClick={closeDetail} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to rooms
                </button>
                <button onClick={closeDetail} className="p-1.5 rounded-lg hover:bg-canvas transition-colors">
                  <X className="w-5 h-5 text-ink-muted" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <BedDouble className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-ink">Room {roomDetail?.roomNumber}</h2>
                  <p className="text-sm text-ink-secondary capitalize">{roomDetail?.roomType} · {roomDetail?.beds?.length || 0} beds · {formatCurrency(roomDetail?.rentPerBed || 0)}/mo</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center h-32 gap-3">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-ink-muted">Loading room details...</p>
                </div>
              ) : roomDetail ? (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard title="Total Beds" value={roomDetail?.beds?.length || 0} icon={BedDouble} iconColor="text-info bg-info/10" variant="compact" />
                    <StatCard title="Occupied" value={roomDetail?.beds?.filter((b) => b.tenantName).length || 0} icon={User} iconColor="text-success bg-success/10" variant="compact" />
                    <StatCard title="Vacant" value={(roomDetail?.beds?.length || 0) - (roomDetail?.beds?.filter((b) => b.tenantName).length || 0)} icon={CheckCircle2} iconColor="text-muted bg-gray-100" variant="compact" />
                  </div>

                  {/* Residents */}
                  <div>
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Residents ({roomDetail.tenants.length})</h4>
                    {roomDetail.tenants.length === 0 ? (
                      <EmptyState icon={BedDouble} title="No residents" description="This room has no tenants" />
                    ) : (
                      <div className="space-y-3">
                        {roomDetail.tenants.map((tenant) => (
                          <button
                            key={tenant.id}
                            onClick={() => fetchTenantDetail(tenant.id)}
                            className="w-full text-left bg-canvas rounded-xl border border-border-subtle overflow-hidden hover:shadow-md hover:border-accent/30 transition-all group"
                          >
                            <div className="p-4">
                              <div className="flex items-start gap-3">
                                <Avatar name={tenant.fullName} size="md" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-ink truncate group-hover:text-accent transition-colors">{tenant.fullName}</p>
                                    <Badge variant={tenant.status === "active" ? "success" : "default"}>{tenant.status}</Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-ink-muted">
                                    <span>Bed {roomDetail.beds.find((b) => b.id === tenant.bedId)?.bedNumber || "N/A"}</span>
                                    <span>Since {tenant.moveInDate?.slice(0, 10)}</span>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
                              </div>
                            </div>
                            {tenant.latestPayment && (
                              <div className="border-t border-border-subtle p-4 bg-surface">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-ink-muted uppercase">Payment</span>
                                  <span className="text-xs text-ink-muted">{tenant.latestPayment.monthYear}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-ink">{formatCurrency(tenant.latestPayment.totalAmount)}</span>
                                  {tenant.latestPayment.balanceAmount > 0 ? (
                                    <Badge variant="warning">₹{tenant.latestPayment.balanceAmount} due</Badge>
                                  ) : (
                                    <Badge variant="success">Paid</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Deposit Summary */}
                  {roomDetail.tenants.length > 0 && (
                    <div className="bg-canvas rounded-lg border border-border-subtle p-4">
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Deposit Summary</h4>
                      <div className="space-y-1">
                        {roomDetail.tenants.map((t) => (
                          <div key={t.id} className="flex items-center justify-between text-xs">
                            <span className="text-ink-secondary">{t.fullName}</span>
                            <span className="font-medium text-ink">{formatCurrency(t.depositPaid)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-border-subtle">
                          <span className="text-ink">Total Deposits</span>
                          <span className="text-ink">{formatCurrency(roomDetail.tenants.reduce((sum, t) => sum + (t.depositPaid || 0), 0))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Tenant Detail Modal ────────────────────────────────────────── */}
      {showTenantPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeTenantDetail} />
          <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in">
            <div className="p-5 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <button onClick={closeTenantDetail} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to room
                </button>
                <button onClick={closeTenantDetail} className="p-1.5 rounded-lg hover:bg-canvas transition-colors">
                  <X className="w-5 h-5 text-ink-muted" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Avatar name={tenantDetail?.profile.fullName || ""} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-ink truncate">{tenantDetail?.profile.fullName}</h2>
                    <Badge variant={tenantDetail?.profile.status === "active" ? "success" : "default"}>{tenantDetail?.profile.status}</Badge>
                  </div>
                  <p className="text-sm text-ink-secondary">{tenantDetail?.room ? `Room ${tenantDetail.room.roomNumber}` : "No room"} · {tenantDetail?.bed ? `Bed ${tenantDetail.bed.bedNumber}` : "No bed"}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
              {tenantLoading ? (
                <div className="flex flex-col items-center justify-center h-32 gap-3">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-ink-muted">Loading tenant details...</p>
                </div>
              ) : tenantDetail ? (
                <>
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard title="Monthly Rent" value={formatCurrency(tenantDetail.profile.rentAmount)} icon={CreditCard} iconColor="text-info bg-info/10" variant="compact" />
                    <StatCard title="Deposit Paid" value={formatCurrency(tenantDetail.profile.depositPaid)} icon={Shield} iconColor="text-success bg-success/10" variant="compact" />
                    <StatCard
                      title="Balance Due"
                      value={formatCurrency(tenantDetail.paymentSummary.totalBalance)}
                      icon={AlertCircle}
                      iconColor={tenantDetail.paymentSummary.totalBalance > 0 ? "text-danger bg-danger/10" : "text-success bg-success/10"}
                      variant="compact"
                    />
                    <StatCard title="Move-in Date" value={tenantDetail.profile.moveInDate?.slice(0, 10) || "N/A"} icon={Calendar} iconColor="text-ink-muted bg-gray-100" variant="compact" />
                  </div>

                  {/* Payment History Chart */}
                  {tenantDetail.paymentHistory.length > 1 && (
                    <div className="bg-canvas rounded-xl border border-border-subtle p-4">
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Payment Trend</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={tenantDetail.paymentHistory.map((p) => ({ month: p.monthYear, due: p.totalAmount, paid: p.paidAmount }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }} formatter={(value) => [formatCurrency(Number(value)), ""]} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="due" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Due" />
                          <Bar dataKey="paid" fill="#059669" radius={[4, 4, 0, 0]} name="Paid" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Personal Info */}
                  <div className="bg-canvas rounded-xl border border-border-subtle p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Personal Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {tenantDetail.profile.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.phone}</span></div>}
                      {tenantDetail.profile.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.email}</span></div>}
                      {tenantDetail.profile.gender && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink capitalize">{tenantDetail.profile.gender}</span></div>}
                      {tenantDetail.profile.dateOfBirth && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.dateOfBirth}</span></div>}
                      {tenantDetail.profile.occupation && <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.occupation}{tenantDetail.profile.companyName ? ` at ${tenantDetail.profile.companyName}` : ""}</span></div>}
                      {tenantDetail.profile.bloodGroup && <div className="flex items-center gap-2"><Heart className="w-3.5 h-3.5 text-ink-muted" /><span className="text-ink">{tenantDetail.profile.bloodGroup}</span></div>}
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-canvas rounded-xl border border-border-subtle p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Payment Summary</h4>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-surface rounded-lg p-2"><p className="text-lg font-bold text-ink">{tenantDetail.paymentSummary.totalPayments}</p><p className="text-[10px] text-ink-muted uppercase">Total</p></div>
                      <div className="bg-green-50 rounded-lg p-2"><p className="text-lg font-bold text-green-700">{tenantDetail.paymentSummary.paidCount}</p><p className="text-[10px] text-green-600 uppercase">Paid</p></div>
                      <div className="bg-amber-50 rounded-lg p-2"><p className="text-lg font-bold text-amber-700">{tenantDetail.paymentSummary.partialCount}</p><p className="text-[10px] text-amber-600 uppercase">Partial</p></div>
                      <div className="bg-red-50 rounded-lg p-2"><p className="text-lg font-bold text-red-700">{tenantDetail.paymentSummary.pendingCount}</p><p className="text-[10px] text-red-600 uppercase">Pending</p></div>
                    </div>
                  </div>

                  {/* Record Payment Button */}
                  {tenantDetail.paymentSummary.totalBalance > 0 && (
                    <button
                      onClick={() => {
                        const pendingPayment = tenantDetail.paymentHistory.find((p) => p.balanceAmount > 0);
                        if (pendingPayment) openPayModal(pendingPayment);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-dark active:scale-[0.98] transition-all"
                    >
                      <IndianRupee className="w-4 h-4" /> Record Payment — {formatCurrency(tenantDetail.paymentSummary.totalBalance)} due
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ──────────────────────────────────────── */}
      {showPayModal && payPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md animate-fade-in">
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Record Payment</h2>
                <button onClick={() => setShowPayModal(false)} className="p-1.5 rounded-lg hover:bg-canvas transition-colors"><X className="w-5 h-5 text-ink-muted" /></button>
              </div>
              <p className="text-sm text-ink-muted mt-1">{payPayment.monthYear}</p>
            </div>
            <div className="p-5 space-y-4">
              {payError && <div className="p-3 rounded-lg bg-danger-light border border-danger/20 text-sm text-danger">{payError}</div>}
              <div className="bg-canvas rounded-lg border border-border-subtle p-3 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-ink-secondary">Total Due</span><span className="font-semibold text-ink">{formatCurrency(payPayment.totalAmount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-ink-secondary">Already Paid</span><span className="font-medium text-success">{formatCurrency(payPayment.paidAmount)}</span></div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border-subtle"><span className="text-ink">Balance</span><span className="text-danger">{formatCurrency(payPayment.balanceAmount)}</span></div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Amount to Record *</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">₹</span>
                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} min="0" max={payPayment.balanceAmount} className="w-full h-10 pl-7 pr-3 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Payment Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                  <option value="cash">Cash</option>
                  <option value="upi_direct">UPI</option>
                  <option value="neft_imps">NEFT / IMPS</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Transaction ID (optional)</label>
                <input type="text" value={payTxnId} onChange={(e) => setPayTxnId(e.target.value)} placeholder="e.g. UPI ref, cheque number" className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              </div>
            </div>
            <div className="p-5 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowPayModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors">Cancel</button>
              <button
                onClick={handleRecordPayment}
                disabled={paySubmitting || !payAmount || Number(payAmount) <= 0}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                  paySubmitting || !payAmount || Number(payAmount) <= 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-accent text-white hover:bg-accent-dark active:scale-[0.98]"
                )}
              >
                {paySubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Recording...</> : <><Check className="w-4 h-4" /> Record Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Room Modal */}
      {showCreateRoom && (
        <CreateRoomModal
          open={showCreateRoom}
          onClose={() => setShowCreateRoom(false)}
          propertyId={selectedPropertyId}
          floorId={selectedFloorId}
          floorNumber={selectedFloorNumber}
          onSuccess={(newRoom) => {
            setRooms((prev) => [...prev, { ...newRoom, beds: [] }]);
            setShowCreateRoom(false);
          }}
        />
      )}
    </div>
  );
}
