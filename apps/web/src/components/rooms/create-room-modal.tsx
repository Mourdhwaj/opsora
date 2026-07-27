"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { X, BedDouble, Plus, Minus, Check, Loader2, Sparkles, Layers } from "lucide-react";

interface FloorOption {
  id: string;
  floorNumber: number;
  floorName: string;
}

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  floorId: string;
  floorNumber: number;
  onSuccess?: (room: any) => void;
}

export function CreateRoomModal({ open, onClose, propertyId, floorId, floorNumber, onSuccess }: CreateRoomModalProps) {
  const [form, setForm] = useState({
    roomNumber: "",
    roomType: "shared",
    roomCategory: "shared",
    sharingType: 2,
    totalBeds: 2,
    rentPerBed: 5000,
    depositAmount: 10000,
    amenities: [] as string[],
    gender: "mixed",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amenityInput, setAmenityInput] = useState("");
  const [floors, setFloors] = useState<FloorOption[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState(floorId);
  const [selectedFloorNumber, setSelectedFloorNumber] = useState(floorNumber);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [creatingFloor, setCreatingFloor] = useState(false);

  // Fetch floors when modal opens and floorId is empty
  useEffect(() => {
    if (!open || !propertyId) return;
    if (floorId) {
      setSelectedFloorId(floorId);
      setSelectedFloorNumber(floorNumber);
      return;
    }
    setLoadingFloors(true);
    api.get<FloorOption[]>(`/properties/${propertyId}/floors`)
      .then((res) => {
        const data = Array.isArray(res) ? res : [];
        setFloors(data);
        if (data.length > 0) {
          setSelectedFloorId(data[0].id);
          setSelectedFloorNumber(data[0].floorNumber);
        }
      })
      .catch(() => setFloors([]))
      .finally(() => setLoadingFloors(false));
  }, [open, propertyId, floorId, floorNumber]);

  const handleCreateFloor = async () => {
    if (!newFloorName.trim()) return;
    setCreatingFloor(true);
    try {
      const nextFloorNumber = floors.length > 0 ? Math.max(...floors.map((f) => f.floorNumber)) + 1 : 1;
      const floor = await api.post<{ id: string; floorNumber: number; floorName: string }>("/floors", {
        propertyId,
        floorNumber: nextFloorNumber,
        floorName: newFloorName.trim(),
      });
      setFloors((prev) => [...prev, floor]);
      setSelectedFloorId(floor.id);
      setSelectedFloorNumber(floor.floorNumber);
      setNewFloorName("");
    } catch (err: any) {
      setError(err?.message || "Failed to create floor");
    } finally {
      setCreatingFloor(false);
    }
  };

  const activeFloorId = floorId || selectedFloorId;
  const activeFloorNumber = floorNumber || selectedFloorNumber;

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const addAmenity = () => {
    if (amenityInput.trim() && !form.amenities.includes(amenityInput.trim())) {
      update("amenities", [...form.amenities, amenityInput.trim()]);
      setAmenityInput("");
    }
  };

  const removeAmenity = (a: string) => update("amenities", form.amenities.filter((x) => x !== a));

  const handleSubmit = async () => {
    if (!form.roomNumber.trim()) { setError("Room number is required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      if (!activeFloorId) {
        setError("Please select or create a floor first");
        setSubmitting(false);
        return;
      }
      const room = await api.post("/rooms", {
        propertyId,
        floorId: activeFloorId,
        roomNumber: form.roomNumber,
        roomType: form.roomType,
        roomCategory: form.roomCategory,
        sharingType: form.sharingType,
        totalBeds: form.totalBeds,
        rentPerBed: form.rentPerBed,
        depositAmount: form.depositAmount,
        amenities: JSON.stringify(form.amenities),
        gender: form.gender,
      });
      onSuccess?.(room);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create room");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset state when modal closes to avoid stale data
  useEffect(() => {
    if (!open) {
      setFloors([]);
      setSelectedFloorId("");
      setSelectedFloorNumber(0);
      setNewFloorName("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface p-5 border-b border-border rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <BedDouble className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Add Room</h2>
                <p className="text-xs text-ink-muted">{activeFloorNumber ? `Floor ${activeFloorNumber}` : "Select a floor"} · Beds auto-generated</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-canvas transition-colors">
              <X className="w-5 h-5 text-ink-muted" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {error && <div className="p-3 rounded-lg bg-danger-light border border-danger/20 text-sm text-danger">{error}</div>}

          {/* Floor Selection (only when floorId is not provided) */}
          {!floorId && (
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Floor *</label>
              {loadingFloors ? (
                <div className="flex items-center gap-2 mt-1.5 px-3 py-2.5 rounded-lg border border-border bg-surface">
                  <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />
                  <span className="text-sm text-ink-muted">Loading floors...</span>
                </div>
              ) : floors.length > 0 ? (
                <select
                  value={selectedFloorId}
                  onChange={(e) => {
                    const floor = floors.find((f) => f.id === e.target.value);
                    setSelectedFloorId(e.target.value);
                    setSelectedFloorNumber(floor?.floorNumber || 1);
                  }}
                  className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>{f.floorName} (Floor {f.floorNumber})</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2 mt-1.5">
                  <p className="text-xs text-ink-muted">No floors exist yet. Create one:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFloorName}
                      onChange={(e) => setNewFloorName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateFloor()}
                      placeholder="e.g. Floor 1"
                      className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                    <button
                      onClick={handleCreateFloor}
                      disabled={creatingFloor || !newFloorName.trim()}
                      className="flex items-center gap-1.5 px-3 h-10 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50"
                    >
                      {creatingFloor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Room Number */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Room Number *</label>
            <input
              type="text"
              value={form.roomNumber}
              onChange={(e) => update("roomNumber", e.target.value)}
              placeholder={`e.g. ${activeFloorNumber}01, ${activeFloorNumber}02`}
              className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>

          {/* Type & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Room Type</label>
              <select value={form.roomType} onChange={(e) => { update("roomType", e.target.value); update("roomCategory", e.target.value); }} className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                <option value="shared">Shared</option>
                <option value="single">Single</option>
                <option value="couple">Couple</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Gender</label>
              <select value={form.gender} onChange={(e) => update("gender", e.target.value)} className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                <option value="mixed">Mixed</option>
                <option value="male">Male Only</option>
                <option value="female">Female Only</option>
              </select>
            </div>
          </div>

          {/* Beds & Sharing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Total Beds</label>
              <div className="flex items-center gap-2 mt-1.5">
                <button onClick={() => { const b = Math.max(1, form.totalBeds - 1); update("totalBeds", b); update("sharingType", b); }} className="w-10 h-10 rounded-lg border border-border bg-canvas hover:bg-surface flex items-center justify-center transition-colors">
                  <Minus className="w-4 h-4 text-ink-muted" />
                </button>
                <input type="number" value={form.totalBeds} onChange={(e) => { const b = Math.max(1, Number(e.target.value)); update("totalBeds", b); update("sharingType", b); }} min={1} max={12} className="flex-1 h-10 text-center rounded-lg border border-border bg-surface text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                <button onClick={() => { const b = Math.min(12, form.totalBeds + 1); update("totalBeds", b); update("sharingType", b); }} className="w-10 h-10 rounded-lg border border-border bg-canvas hover:bg-surface flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4 text-ink-muted" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Sharing Type</label>
              <select value={form.sharingType} onChange={(e) => update("sharingType", Number(e.target.value))} className="w-full h-10 px-3 mt-1.5 rounded-lg border border-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}-sharing</option>)}
              </select>
            </div>
          </div>

          {/* Rent & Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Rent per Bed (₹)</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">₹</span>
                <input type="number" value={form.rentPerBed} onChange={(e) => update("rentPerBed", Number(e.target.value))} min={0} className="w-full h-10 pl-7 pr-3 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Deposit (₹)</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">₹</span>
                <input type="number" value={form.depositAmount} onChange={(e) => update("depositAmount", Number(e.target.value))} min={0} className="w-full h-10 pl-7 pr-3 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Amenities</label>
            <div className="flex gap-2 mt-1.5">
              <input
                type="text"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())}
                placeholder="e.g. AC, WiFi, Geyser"
                className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
              <button onClick={addAmenity} className="h-10 px-3 rounded-lg bg-canvas border border-border hover:bg-surface text-sm font-medium text-ink-secondary transition-colors">
                Add
              </button>
            </div>
            {form.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.amenities.map((a) => (
                  <button key={a} onClick={() => removeAmenity(a)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors">
                    {a} <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bed Preview */}
          <div className="bg-canvas rounded-xl border border-border-subtle p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Bed Preview ({form.totalBeds} beds)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: form.totalBeds }, (_, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border text-xs">
                  <BedDouble className="w-3.5 h-3.5 text-ink-muted" />
                  <span className="font-medium text-ink">B{i + 1}</span>
                  <span className="text-ink-muted">·</span>
                  <span className="text-ink-muted">{formatCurrency(form.rentPerBed)}/mo</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-muted mt-3">
              Total potential: <span className="font-semibold text-ink">{formatCurrency(form.rentPerBed * form.totalBeds)}/mo</span> · <span className="font-semibold text-ink">{formatCurrency(form.depositAmount * form.totalBeds)}</span> deposits
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface p-5 border-t border-border rounded-b-2xl flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.roomNumber.trim()}
            className={cn(
              "flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              submitting || !form.roomNumber.trim()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-accent text-white hover:bg-accent-dark active:scale-[0.98]"
            )}
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Check className="w-4 h-4" /> Create Room</>}
          </button>
        </div>
      </div>
    </div>
  );
}
