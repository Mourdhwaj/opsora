"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Resident {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  roomId: string;
  bedId: string;
  status: string;
  moveInDate: string;
  rentAmount: number;
  propertyId: string;
}

interface ResidentWithRoom extends Resident {
  roomNumber?: string;
  bedNumber?: string;
}

export default function StaffResidentsPage() {
  const [residents, setResidents] = useState<ResidentWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedResident, setSelectedResident] = useState<ResidentWithRoom | null>(null);

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ data: Resident[]; pagination: { total: number } }>("/residents?limit=200");
      const residentsData = response?.data || [];

      // Fetch room and bed details for each resident
      const enriched = await Promise.all(
        residentsData.map(async (r) => {
          try {
            if (r.roomId) {
              const room = await api.get<{ roomNumber: string }>(`/properties/rooms/${r.roomId}`);
              const bed = r.bedId ? await api.get<{ bedNumber: string }>(`/properties/rooms/${r.roomId}/beds/${r.bedId}`).catch(() => null) : null;
              return { ...r, roomNumber: room?.roomNumber, bedNumber: bed?.bedNumber };
            }
          } catch {
            // If room fetch fails, return resident without room info
          }
          return r;
        })
      );

      setResidents(enriched);
    } catch (err) {
      setError("Failed to load residents");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = residents.filter(
    (r) =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.includes(search) ||
      r.roomNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-ink-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Residents</h1>
        <p className="text-ink-secondary mt-1">View resident information ({residents.length} total)</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by name, phone, or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-md px-4 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
      </div>

      {/* Residents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-ink-muted">
            No residents found
          </div>
        ) : (
          filtered.map((resident) => (
            <button
              key={resident.id}
              onClick={() => setSelectedResident(selectedResident?.id === resident.id ? null : resident)}
              className={`p-5 rounded-xl bg-surface border text-left transition-all hover:shadow-md ${
                selectedResident?.id === resident.id
                  ? "border-accent ring-2 ring-accent/20"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent flex-shrink-0">
                  {resident.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{resident.fullName}</p>
                  <p className="text-sm text-ink-secondary mt-0.5">
                    {resident.roomNumber ? `Room ${resident.roomNumber}` : "No room"}
                    {resident.bedNumber ? ` · Bed ${resident.bedNumber}` : ""}
                  </p>
                  <p className="text-sm text-ink-muted mt-0.5">{resident.phone}</p>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    resident.status === "active"
                      ? "bg-success/10 text-success"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {resident.status}
                </span>
              </div>

              {/* Expanded Details */}
              {selectedResident?.id === resident.id && (
                <div className="mt-4 pt-4 border-t border-border-subtle space-y-2">
                  {resident.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-ink-muted">Email:</span>
                      <span className="text-ink">{resident.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-ink-muted">Rent:</span>
                    <span className="text-ink font-medium">₹{resident.rentAmount?.toLocaleString()}</span>
                  </div>
                  {resident.moveInDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-ink-muted">Move-in:</span>
                      <span className="text-ink">{new Date(resident.moveInDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
