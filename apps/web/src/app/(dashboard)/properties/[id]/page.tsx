"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Building2, BedDouble, Users, IndianRupee, AlertTriangle,
  ArrowLeft, MapPin, Wifi, Layers, Home,
  ChevronRight, CheckCircle2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Interfaces ──────────────────────────────────────────────────────────────
interface PropertyDetail {
  property: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    propertyType?: string;
    totalFloors?: number;
    wifiSsid?: string;
    amenities?: string;
    createdAt: string;
  };
  rooms: Array<{
    id: string;
    roomNumber: string;
    roomType: string;
    rentPerBed: number;
    status: string;
    floorId: string;
  }>;
  beds: Array<{
    id: string;
    roomId: string;
    bedNumber: string;
    status: string;
    rentAmount: number;
  }>;
  activeTenants: number;
  openComplaints: number;
  waterTanks: number;
}

interface RoomWithTenants {
  id: string;
  propertyId: string;
  floorId: string;
  roomNumber: string;
  roomType: string;
  rentPerBed: number;
  beds: Array<{
    id: string;
    bedNumber: string;
    status: string;
    tenantName?: string;
    tenantProfileId?: string;
  }>;
}

interface Resident {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  occupation?: string;
  moveInDate: string;
  roomNumber?: string;
  bedNumber?: string;
  rentAmount: number;
  depositPaid: number;
  status: string;
}

interface PaymentRecord {
  id: string;
  monthYear: string;
  tenantProfileId: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  tenantName?: string;
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
  tenantName?: string;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [rooms, setRooms] = useState<RoomWithTenants[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "rooms" | "residents" | "payments" | "complaints">("overview");

  // Fetch all data in parallel
  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get<PropertyDetail>(`/dashboard/property/${propertyId}`),
      api.get<RoomWithTenants[] | { data: RoomWithTenants[] }>("/rooms/with-tenants", { propertyId }),
      api.get<{ data: Resident[]; pagination: { total: number } }>("/residents", { propertyId, limit: "100" }),
      api.get<{ data: PaymentRecord[]; pagination: { total: number } }>("/payments", { propertyId, limit: "50" }),
      api.get<{ data: Complaint[]; pagination: { total: number } }>("/complaints", { propertyId, limit: "50" }),
    ])
      .then(([propDetail, roomsRes, residentsRes, paymentsRes, complaintsRes]) => {
        setProperty(propDetail);
        const roomsData = Array.isArray(roomsRes) ? roomsRes : (roomsRes as any)?.data || [];
        setRooms(roomsData);
        setResidents(residentsRes?.data || []);
        setPayments(paymentsRes?.data || []);
        setComplaints(complaintsRes?.data || []);
      })
      .catch(() => setError("Failed to load property details"))
      .finally(() => setLoading(false));
  }, [propertyId]);

  // Compute stats
  const totalBeds = property?.beds?.length || 0;
  const occupiedBeds = property?.beds?.filter((b) => b.status === "occupied").length || 0;
  const vacantBeds = totalBeds - occupiedBeds;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const totalRevenue = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);
  const pendingRevenue = payments.reduce((s, p) => s + (p.balanceAmount || 0), 0);

  // Group rooms by floor
  const floors = [...new Set(rooms.map((r) => r.roomNumber.charAt(0)))].sort();
  const revenueByMonth = payments.reduce((acc, p) => {
    const existing = acc.find((a) => a.month === p.monthYear);
    if (existing) {
      existing.expected += p.totalAmount || 0;
      existing.collected += p.paidAmount || 0;
    } else {
      acc.push({ month: p.monthYear, expected: p.totalAmount || 0, collected: p.paidAmount || 0 });
    }
    return acc;
  }, [] as Array<{ month: string; expected: number; collected: number }>);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-48 bg-surface rounded-lg animate-shimmer" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-surface border border-border animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" />
          <p className="text-sm text-ink-secondary">{error || "Property not found"}</p>
          <button onClick={() => router.push("/properties")} className="mt-3 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark">
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Home },
    { id: "rooms" as const, label: `Rooms (${rooms.length})`, icon: BedDouble },
    { id: "residents" as const, label: `Residents (${residents.length})`, icon: Users },
    { id: "payments" as const, label: `Payments (${payments.length})`, icon: IndianRupee },
    { id: "complaints" as const, label: `Complaints (${complaints.length})`, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button + Property Header */}
      <div>
        <button onClick={() => router.push("/properties")} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Properties
        </button>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-ink truncate">{property.property.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted mt-1">
              {property.property.address && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {property.property.address}{property.property.city ? `, ${property.property.city}` : ""}</span>
              )}
              {property.property.propertyType && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-canvas uppercase">{property.property.propertyType}</span>
              )}
              {property.property.wifiSsid && (
                <span className="flex items-center gap-1 text-success"><Wifi className="w-3.5 h-3.5" /> {property.property.wifiSsid}</span>
              )}
              {property.property.totalFloors && (
                <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {property.property.totalFloors} floors</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Beds" value={totalBeds} icon={BedDouble} iconColor="text-info bg-info/10" subtitle={`${occupiedBeds} occupied`} />
        <StatCard title="Occupancy" value={`${occupancyRate}%`} icon={CheckCircle2} iconColor="text-success bg-success/10" subtitle={`${vacantBeds} vacant`} />
        <StatCard title="Revenue" value={formatCurrency(totalRevenue)} icon={IndianRupee} iconColor="text-warning bg-warning/10" subtitle={`${formatCurrency(pendingRevenue)} pending`} />
        <StatCard title="Complaints" value={complaints.filter((c) => c.status === "open").length} icon={AlertTriangle} iconColor="text-danger bg-danger/10" subtitle={`${complaints.length} total`} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.id
                  ? "text-accent border-accent"
                  : "text-ink-muted border-transparent hover:text-ink hover:border-border"
              )}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {/* ── Overview Tab ──────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Revenue Chart */}
          {revenueByMonth.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Revenue by Month</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(v) => [formatCurrency(Number(v))]} />
                  <Legend />
                  <Bar dataKey="expected" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Expected" />
                  <Bar dataKey="collected" fill="#059669" radius={[4, 4, 0, 0]} name="Collected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Residents */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Recent Residents</h3>
              <button onClick={() => setActiveTab("residents")} className="text-xs text-accent hover:underline">View All</button>
            </div>
            {residents.filter((r) => r.status === "active").length > 0 ? (
              <div className="space-y-2">
                {residents.filter((r) => r.status === "active").slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-canvas/50 transition-colors">
                    <Avatar name={r.fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{r.fullName}</p>
                      <p className="text-xs text-ink-muted">Room {r.roomNumber || "—"} · Since {formatDate(r.moveInDate)}</p>
                    </div>
                    <span className="text-sm font-medium text-ink">{formatCurrency(r.rentAmount)}/mo</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} title="No active residents" description="Residents will appear here once assigned" />
            )}
          </div>

          {/* Recent Complaints */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Recent Complaints</h3>
              <button onClick={() => setActiveTab("complaints")} className="text-xs text-accent hover:underline">View All</button>
            </div>
            {complaints.length > 0 ? (
              <div className="space-y-2">
                {complaints.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-canvas/50 transition-colors">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      c.priority === "urgent" ? "bg-red-100 text-red-600" : c.priority === "high" ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-600"
                    )}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{c.title}</p>
                      <p className="text-xs text-ink-muted">{c.ticketNumber} · {c.category}</p>
                    </div>
                    <Badge variant={c.status === "open" ? "warning" : "success"}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={AlertTriangle} title="No complaints" description="This property has no complaints" />
            )}
          </div>
        </div>
      )}

      {/* ── Rooms Tab ────────────────────────────────────────────────── */}
      {activeTab === "rooms" && (
        <div className="space-y-6">
          {floors.length === 0 ? (
            <EmptyState icon={BedDouble} title="No rooms" description="This property has no rooms configured" />
          ) : (
            floors.map((floor) => {
              const floorRooms = rooms.filter((r) => r.roomNumber.charAt(0) === floor);
              return (
                <div key={floor}>
                  <h3 className="text-sm font-semibold text-ink mb-3">Floor {floor}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {floorRooms.map((room) => {
                      const totalRoomBeds = room.beds?.length || 0;
                      const occupiedRoomBeds = room.beds?.filter((b) => b.tenantName).length || 0;
                      return (
                        <div key={room.id} className="bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-lg font-bold text-ink">{room.roomNumber}</span>
                            <Badge variant={occupiedRoomBeds === totalRoomBeds ? "danger" : occupiedRoomBeds > 0 ? "warning" : "success"}>
                              {occupiedRoomBeds}/{totalRoomBeds}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {room.beds?.map((bed) => (
                              <div
                                key={bed.id}
                                className={cn("w-6 h-6 rounded flex items-center justify-center",
                                  bed.tenantName ? "bg-accent text-white" : "bg-white border border-border text-ink-muted"
                                )}
                                title={bed.tenantName || "Vacant"}
                              >
                                <BedDouble className="w-3 h-3" />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-ink-muted capitalize">{room.roomType}</span>
                            <span className="font-medium text-ink">{formatCurrency(room.rentPerBed)}/mo</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Residents Tab ────────────────────────────────────────────── */}
      {activeTab === "residents" && (
        <div className="space-y-3">
          {residents.length === 0 ? (
            <EmptyState icon={Users} title="No residents" description="No residents are assigned to this property" />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-canvas">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Resident</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Room</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Move-in</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Rent</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {residents.map((r) => (
                      <tr key={r.id} className="hover:bg-canvas/50 transition-colors cursor-pointer" onClick={() => router.push(`/residents?propertyId=${propertyId}`)}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.fullName} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-ink">{r.fullName}</p>
                              <p className="text-xs text-ink-muted">{r.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-ink">{r.roomNumber || "—"}</td>
                        <td className="px-5 py-3.5 text-sm text-ink-secondary">{formatDate(r.moveInDate)}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-ink">{formatCurrency(r.rentAmount)}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={r.status === "active" ? "success" : "default"}>{r.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {residents.map((r) => (
                  <div key={r.id} className="bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/residents?propertyId=${propertyId}`)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.fullName} size="md" />
                        <div>
                          <p className="text-sm font-medium text-ink">{r.fullName}</p>
                          <p className="text-xs text-ink-muted">{r.phone} · Room {r.roomNumber || "—"}</p>
                        </div>
                      </div>
                      <Badge variant={r.status === "active" ? "success" : "default"}>{r.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-muted mt-3">
                      <span>Since {formatDate(r.moveInDate)}</span>
                      <span className="font-medium text-ink">{formatCurrency(r.rentAmount)}/mo</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Payments Tab ─────────────────────────────────────────────── */}
      {activeTab === "payments" && (
        <div className="space-y-3">
          {payments.length === 0 ? (
            <EmptyState icon={IndianRupee} title="No payments" description="No payment records for this property" />
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface rounded-xl border border-border p-4 text-center">
                  <p className="text-lg font-bold text-ink">{formatCurrency(payments.reduce((s, p) => s + (p.totalAmount || 0), 0))}</p>
                  <p className="text-xs text-ink-muted uppercase">Total Expected</p>
                </div>
                <div className="bg-surface rounded-xl border border-border p-4 text-center">
                  <p className="text-lg font-bold text-success">{formatCurrency(totalRevenue)}</p>
                  <p className="text-xs text-ink-muted uppercase">Collected</p>
                </div>
                <div className="bg-surface rounded-xl border border-border p-4 text-center">
                  <p className="text-lg font-bold text-danger">{formatCurrency(pendingRevenue)}</p>
                  <p className="text-xs text-ink-muted uppercase">Pending</p>
                </div>
              </div>

              {/* Revenue Chart */}
              {revenueByMonth.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-5">
                  <h3 className="text-sm font-semibold text-ink mb-4">Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} formatter={(v) => [formatCurrency(Number(v))]} />
                      <Bar dataKey="collected" fill="#059669" radius={[4, 4, 0, 0]} name="Collected" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Payment List */}
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-canvas">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Month</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Due</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Paid</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Balance</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-canvas/50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-ink">{p.monthYear}</td>
                        <td className="px-5 py-3 text-sm text-ink">{formatCurrency(p.totalAmount)}</td>
                        <td className="px-5 py-3 text-sm font-medium text-success">{formatCurrency(p.paidAmount)}</td>
                        <td className="px-5 py-3 text-sm font-medium text-danger">{formatCurrency(p.balanceAmount)}</td>
                        <td className="px-5 py-3">
                          <Badge variant={p.paymentStatus === "paid" ? "success" : p.paymentStatus === "partial" ? "warning" : "danger"}>
                            {p.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Complaints Tab ───────────────────────────────────────────── */}
      {activeTab === "complaints" && (
        <div className="space-y-3">
          {complaints.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No complaints" description="This property has no complaints" />
          ) : (
            complaints.map((c) => (
              <div key={c.id} className="bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      c.priority === "urgent" ? "bg-red-100 text-red-600" : c.priority === "high" ? "bg-amber-100 text-amber-600" : c.priority === "medium" ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-600"
                    )}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-ink">{c.title}</h4>
                        <span className="text-xs text-ink-muted font-mono">{c.ticketNumber}</span>
                      </div>
                      <p className="text-xs text-ink-muted mb-2">{c.description}</p>
                      <div className="flex items-center gap-3 text-xs text-ink-muted">
                        <span className="capitalize">{c.category}</span>
                        <span>·</span>
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={c.priority === "urgent" ? "danger" : c.priority === "high" ? "warning" : "default"}>{c.priority}</Badge>
                    <Badge variant={c.status === "open" ? "warning" : c.status === "in_progress" ? "info" : "success"}>{c.status}</Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
