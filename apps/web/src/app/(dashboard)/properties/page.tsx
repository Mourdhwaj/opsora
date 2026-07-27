"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn, formatCurrency, timeAgo, getInitials } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Building2, MapPin, BedDouble, Users, Plus, Search, Trash2,
  X, Check, AlertCircle, ChevronRight, Home, Wifi,
  Layers, IndianRupee, Loader2, ChevronLeft, Bed, Hash,
} from "lucide-react";

interface Property {
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
}

interface FloorConfig {
  floorNumber: number;
  floorName: string;
  roomsPerFloor: number;
  bedsPerRoom: number;
  rentPerBed: number;
  depositAmount: number;
  roomType: "shared" | "single" | "couple";
  gender: "male" | "female" | "mixed";
  roomStartNumber: number;
}

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create wizard
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createForm, setCreateForm] = useState({
    name: "", address: "", city: "", state: "", pincode: "",
    propertyType: "pg", totalFloors: 1,
    wifiSsid: "", wifiPassword: "",
  });
  const [floorConfigs, setFloorConfigs] = useState<FloorConfig[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<{ data: Property[] }>("/properties")
      .then((res) => setProperties(res?.data || []))
      .catch(() => setError("Failed to load properties"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = properties.filter((p) =>
    search === "" || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.address || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.city || "").toLowerCase().includes(search.toLowerCase())
  );

  const initFloorConfigs = useCallback((totalFloors: number) => {
    const configs: FloorConfig[] = [];
    for (let i = 1; i <= totalFloors; i++) {
      configs.push({
        floorNumber: i, floorName: `Floor ${i}`, roomsPerFloor: 10,
        bedsPerRoom: 2, rentPerBed: 7000, depositAmount: 15000,
        roomType: "shared", gender: "mixed", roomStartNumber: i * 100 + 1,
      });
    }
    setFloorConfigs(configs);
  }, []);

  const updateFloorConfig = (index: number, field: keyof FloorConfig, value: any) => {
    setFloorConfigs((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const applyToAllFloors = (field: keyof FloorConfig, value: any) => {
    setFloorConfigs((prev) => prev.map((c) => ({ ...c, [field]: value })));
  };

  const totalRooms = floorConfigs.reduce((s, c) => s + c.roomsPerFloor, 0);
  const totalBeds = floorConfigs.reduce((s, c) => s + c.roomsPerFloor * c.bedsPerRoom, 0);
  const monthlyRevenue = totalBeds * (floorConfigs[0]?.rentPerBed || 7000);

  const handleCreate = async () => {
    if (!createForm.name.trim()) { setCreateError("Property name is required"); return; }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const created = await api.post<Property>("/properties", {
        ...createForm, totalFloors: Number(createForm.totalFloors),
      });
      await api.post("/properties/bulk-setup", {
        propertyId: created.id,
        floors: floorConfigs.map((fc) => ({
          floorNumber: fc.floorNumber, floorName: fc.floorName,
          rooms: Array.from({ length: fc.roomsPerFloor }, (_, r) => ({
            roomNumber: String(fc.roomStartNumber + r), roomType: fc.roomType,
            sharingType: fc.bedsPerRoom, bedsPerRoom: fc.bedsPerRoom,
            rentPerBed: fc.rentPerBed, depositAmount: fc.depositAmount, gender: fc.gender,
          })),
        })),
      });
      setProperties((prev) => [created, ...prev]);
      setShowCreate(false); setCreateStep(1);
      setCreateForm({ name: "", address: "", city: "", state: "", pincode: "", propertyType: "pg", totalFloors: 1, wifiSsid: "", wifiPassword: "" });
      setFloorConfigs([]);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create property");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.del(`/properties/${deleteId}`);
      setProperties((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch (err: any) {
      alert(err?.message || "Failed to delete property");
    } finally {
      setDeleting(false);
    }
  };

  const totalProperties = properties.length;

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Properties" description="Manage your PG/hostel properties" icon={Building2} />
        <EmptyState icon={AlertCircle} title="Failed to load properties" description={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Properties</h1>
          <p className="text-sm text-ink-secondary mt-1">{totalProperties} {totalProperties === 1 ? "property" : "properties"} in your portfolio</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateStep(1); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-dark active:scale-[0.98] transition-all">
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard title="Total Properties" value={totalProperties} icon={Building2} iconColor="text-accent bg-accent/10" />
        <StatCard title="Cities" value={new Set(properties.map((p) => p.city).filter(Boolean)).size} icon={MapPin} iconColor="text-info bg-info/10" />
        <StatCard title="With WiFi" value={properties.filter((p) => p.wifiSsid).length} icon={Wifi} iconColor="text-success bg-success/10" />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
        <input type="text" placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors" />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-52 rounded-xl bg-surface border border-border animate-shimmer" />))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title={search ? "No properties match your search" : "No properties yet"} description={search ? "Try a different search term" : "Add your first property to get started"} />
      ) : (
        <>
          {/* ── Table - Desktop ───────────────────────────────────────────── */}
          <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-canvas">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Property</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Location</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Floors</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">WiFi</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((property) => (
                  <tr key={property.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-5 py-3.5 cursor-pointer" onClick={() => router.push(`/properties/${property.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">{getInitials(property.name)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate hover:text-accent transition-colors">{property.name}</p>
                          {property.address && <p className="text-xs text-ink-muted truncate max-w-[200px]">{property.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-canvas text-ink-muted uppercase">{property.propertyType || "PG"}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
                        <MapPin className="w-3 h-3 text-ink-muted flex-shrink-0" />
                        <span className="truncate max-w-[160px]">{property.city || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-ink">
                        <Layers className="w-3.5 h-3.5 text-ink-muted" />
                        {property.totalFloors || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {property.wifiSsid ? (
                        <span className="flex items-center gap-1 text-xs text-success"><Wifi className="w-3 h-3" /> {property.wifiSsid}</span>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => router.push(`/properties/${property.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-accent hover:bg-accent/8 transition-colors">
                          <ChevronRight className="w-3.5 h-3.5" /> Details
                        </button>
                        <button onClick={() => setDeleteId(property.id)} className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger-light transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Cards - Mobile ────────────────────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {filtered.map((property) => (
              <div key={property.id} className="bg-surface rounded-xl border border-border overflow-hidden transition-all hover:shadow-md">
                {/* Color accent bar */}
                <div className="h-1 bg-gradient-to-r from-accent to-accent-light" />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">{getInitials(property.name)}</div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink truncate">{property.name}</h3>
                        {property.address && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-ink-muted flex-shrink-0" />
                            <p className="text-xs text-ink-muted truncate">{property.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-canvas text-ink-muted uppercase flex-shrink-0 ml-2">{property.propertyType || "PG"}</span>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-3 text-xs text-ink-muted mt-3">
                    {property.totalFloors && (
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {property.totalFloors} floors</span>
                    )}
                    {property.city && (
                      <span className="flex items-center gap-1"><Home className="w-3 h-3" /> {property.city}</span>
                    )}
                    {property.wifiSsid && (
                      <span className="flex items-center gap-1 text-success"><Wifi className="w-3 h-3" /> WiFi</span>
                    )}
                    <span className="ml-auto text-[10px]">{timeAgo(property.createdAt)}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                    <button onClick={() => router.push(`/properties/${property.id}`)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-accent bg-accent/8 hover:bg-accent/15 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" /> Details
                    </button>
                    <button onClick={() => setDeleteId(property.id)} className="p-2 rounded-lg text-ink-muted hover:text-danger hover:bg-danger-light transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Create Property Wizard ──────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowCreate(false); setCreateStep(1); }} />
          <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-2xl animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-surface p-5 border-b border-border rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-accent" /></div>
                  <div>
                    <h2 className="text-lg font-bold text-ink">{createStep === 1 ? "Add Property" : "Configure Floors & Rooms"}</h2>
                    <p className="text-xs text-ink-muted">{createStep === 1 ? "Step 1: Property details" : "Step 2: Set up rooms in bulk"}</p>
                  </div>
                </div>
                <button onClick={() => { setShowCreate(false); setCreateStep(1); }} className="p-1.5 rounded-lg hover:bg-canvas transition-colors"><X className="w-5 h-5 text-ink-muted" /></button>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className={cn("flex items-center gap-1.5 text-xs font-medium", createStep === 1 ? "text-accent" : "text-success")}>
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", createStep === 1 ? "bg-accent text-white" : "bg-success text-white")}>{createStep === 1 ? "1" : <Check className="w-3 h-3" />}</div> Property
                </div>
                <div className="flex-1 h-px bg-border" />
                <div className={cn("flex items-center gap-1.5 text-xs font-medium", createStep === 2 ? "text-accent" : "text-ink-muted")}>
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", createStep === 2 ? "bg-accent text-white" : "bg-canvas border border-border")}>2</div> Floors & Rooms
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {createError && (<div className="p-3 rounded-lg bg-danger-light border border-danger/20 text-sm text-danger">{createError}</div>)}

              {createStep === 1 && (
                <>
                  <div><label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Property Name *</label><input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Sunshine PG" className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                  <div><label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Address</label><input type="text" value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} placeholder="Street address" className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">City</label><input type="text" value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} placeholder="City" className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                    <div><label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">State</label><input type="text" value={createForm.state} onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })} placeholder="State" className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                    <div><label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Pincode</label><input type="text" value={createForm.pincode} onChange={(e) => setCreateForm({ ...createForm, pincode: e.target.value })} placeholder="Pincode" className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Property Type</label><select value={createForm.propertyType} onChange={(e) => setCreateForm({ ...createForm, propertyType: e.target.value })} className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"><option value="pg">PG</option><option value="hostel">Hostel</option><option value="apartment">Apartment</option><option value="dormitory">Dormitory</option></select></div>
                    <div><label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Total Floors</label><input type="number" value={createForm.totalFloors} onChange={(e) => { const f = Math.max(1, Number(e.target.value)); setCreateForm({ ...createForm, totalFloors: f }); initFloorConfigs(f); }} min={1} max={50} className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                  </div>
                  <div className="bg-canvas rounded-lg border border-border-subtle p-4 space-y-3">
                    <div className="flex items-center gap-2"><Wifi className="w-4 h-4 text-ink-muted" /><span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">WiFi Details (optional)</span></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">SSID</label><input type="text" value={createForm.wifiSsid} onChange={(e) => setCreateForm({ ...createForm, wifiSsid: e.target.value })} placeholder="WiFi network name" className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                      <div><label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Password</label><input type="text" value={createForm.wifiPassword} onChange={(e) => setCreateForm({ ...createForm, wifiPassword: e.target.value })} placeholder="WiFi password" className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                    </div>
                  </div>
                </>
              )}

              {createStep === 2 && (
                <>
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                    <div className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">Quick Apply to All Floors</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><label className="text-[10px] font-medium text-ink-muted">Rooms/Floor</label><input type="number" min={1} max={30} value={floorConfigs[0]?.roomsPerFloor || 10} onChange={(e) => applyToAllFloors("roomsPerFloor", Math.max(1, Number(e.target.value)))} className="w-full h-9 px-2 mt-1 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                      <div><label className="text-[10px] font-medium text-ink-muted">Beds/Room</label><input type="number" min={1} max={12} value={floorConfigs[0]?.bedsPerRoom || 2} onChange={(e) => applyToAllFloors("bedsPerRoom", Math.max(1, Number(e.target.value)))} className="w-full h-9 px-2 mt-1 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                      <div><label className="text-[10px] font-medium text-ink-muted">Rent/Bed (₹)</label><input type="number" min={0} step={500} value={floorConfigs[0]?.rentPerBed || 7000} onChange={(e) => applyToAllFloors("rentPerBed", Math.max(0, Number(e.target.value)))} className="w-full h-9 px-2 mt-1 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                      <div><label className="text-[10px] font-medium text-ink-muted">Deposit (₹)</label><input type="number" min={0} step={1000} value={floorConfigs[0]?.depositAmount || 15000} onChange={(e) => applyToAllFloors("depositAmount", Math.max(0, Number(e.target.value)))} className="w-full h-9 px-2 mt-1 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div><label className="text-[10px] font-medium text-ink-muted">Room Type</label><select value={floorConfigs[0]?.roomType || "shared"} onChange={(e) => applyToAllFloors("roomType", e.target.value)} className="w-full h-9 px-2 mt-1 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"><option value="shared">Shared</option><option value="single">Single</option><option value="couple">Couple</option></select></div>
                      <div><label className="text-[10px] font-medium text-ink-muted">Gender</label><select value={floorConfigs[0]?.gender || "mixed"} onChange={(e) => applyToAllFloors("gender", e.target.value)} className="w-full h-9 px-2 mt-1 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"><option value="mixed">Mixed</option><option value="male">Male</option><option value="female">Female</option></select></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-ink-muted"><Hash className="w-3.5 h-3.5" /> <span className="font-semibold text-ink">{totalRooms}</span> rooms</div>
                    <div className="flex items-center gap-1.5 text-ink-muted"><Bed className="w-3.5 h-3.5" /> <span className="font-semibold text-ink">{totalBeds}</span> beds</div>
                    <div className="flex items-center gap-1.5 text-ink-muted"><IndianRupee className="w-3.5 h-3.5" /> <span className="font-semibold text-ink">{formatCurrency(monthlyRevenue)}</span>/mo</div>
                  </div>
                  <div className="space-y-3">
                    {floorConfigs.map((fc, idx) => (
                      <div key={idx} className="bg-canvas rounded-lg border border-border-subtle p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-accent" /><span className="text-sm font-semibold text-ink">{fc.floorName}</span></div>
                          <span className="text-xs text-ink-muted">{fc.roomsPerFloor} rooms · {fc.roomsPerFloor * fc.bedsPerRoom} beds</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <div><label className="text-[10px] text-ink-muted">Floor Name</label><input type="text" value={fc.floorName} onChange={(e) => updateFloorConfig(idx, "floorName", e.target.value)} className="w-full h-8 px-2 mt-0.5 rounded border border-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent/20" /></div>
                          <div><label className="text-[10px] text-ink-muted">Rooms</label><input type="number" min={1} value={fc.roomsPerFloor} onChange={(e) => updateFloorConfig(idx, "roomsPerFloor", Math.max(1, Number(e.target.value)))} className="w-full h-8 px-2 mt-0.5 rounded border border-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent/20" /></div>
                          <div><label className="text-[10px] text-ink-muted">Beds/Room</label><input type="number" min={1} max={12} value={fc.bedsPerRoom} onChange={(e) => updateFloorConfig(idx, "bedsPerRoom", Math.max(1, Number(e.target.value)))} className="w-full h-8 px-2 mt-0.5 rounded border border-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent/20" /></div>
                          <div><label className="text-[10px] text-ink-muted">Rent/Bed ₹</label><input type="number" min={0} value={fc.rentPerBed} onChange={(e) => updateFloorConfig(idx, "rentPerBed", Math.max(0, Number(e.target.value)))} className="w-full h-8 px-2 mt-0.5 rounded border border-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent/20" /></div>
                          <div><label className="text-[10px] text-ink-muted">Start #</label><input type="number" min={1} value={fc.roomStartNumber} onChange={(e) => updateFloorConfig(idx, "roomStartNumber", Math.max(1, Number(e.target.value)))} className="w-full h-8 px-2 mt-0.5 rounded border border-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent/20" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-surface p-5 border-t border-border rounded-b-2xl flex items-center justify-end gap-3">
              {createStep === 2 && (<button onClick={() => setCreateStep(1)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors"><ChevronLeft className="w-4 h-4" /> Back</button>)}
              <button onClick={() => { setShowCreate(false); setCreateStep(1); }} className="px-4 py-2.5 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors">Cancel</button>
              {createStep === 1 ? (
                <button onClick={() => { if (!createForm.name.trim()) { setCreateError("Property name is required"); return; } setCreateError(null); initFloorConfigs(createForm.totalFloors); setCreateStep(2); }} disabled={!createForm.name.trim()}
                  className={cn("flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all", !createForm.name.trim() ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-accent text-white hover:bg-accent-dark active:scale-[0.98]")}>
                  Next: Configure Rooms <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleCreate} disabled={createSubmitting} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-dark active:scale-[0.98] transition-all disabled:opacity-50">
                  {createSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating {totalRooms} rooms...</>) : (<><Check className="w-4 h-4" /> Create Property ({totalRooms} rooms, {totalBeds} beds)</>)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteId(null)} />
          <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-sm animate-fade-in">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-danger" /></div>
              <h3 className="text-lg font-bold text-ink mb-2">Delete Property?</h3>
              <p className="text-sm text-ink-muted">This will permanently remove the property. Make sure there are no active tenants.</p>
            </div>
            <div className="p-5 border-t border-border flex items-center justify-center gap-3">
              <button onClick={() => setDeleteId(null)} disabled={deleting} className="px-4 py-2.5 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium bg-danger text-white hover:bg-danger-dark active:scale-[0.98] transition-all disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
