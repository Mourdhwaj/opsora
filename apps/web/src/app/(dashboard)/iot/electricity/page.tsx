"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Zap, TrendingUp, IndianRupee, AlertTriangle, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ElectricityMeter {
  id: string;
  meterNumber: string;
  meterType: string;
  costPerUnit: number;
  fixedCharge: number;
  latestReading?: {
    dailyKwh: number;
    powerKw: number;
    estimatedCost: number;
    time: string;
  } | null;
}

interface ElectricityAnalytics {
  meters: { id: string; meterNumber: string; costPerUnit: number }[];
  summary: {
    totalKwh: number;
    totalCost: number;
    avgDaily: number;
    peakPower: number;
    trend: number;
  };
  daily: { date: string; totalKwh: number; totalCost: number; maxPower: number }[];
}

export default function ElectricityIoTPage() {
  const [meters, setMeters] = useState<ElectricityMeter[]>([]);
  const [analytics, setAnalytics] = useState<ElectricityAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [metersData, analyticsData] = await Promise.allSettled([
        api.get<ElectricityMeter[]>("/electricity-meters"),
        api.get<ElectricityAnalytics>("/iot/analytics/electricity?days=7"),
      ]);

      if (metersData.status === "fulfilled") setMeters(metersData.value || []);
      if (analyticsData.status === "fulfilled") setAnalytics(analyticsData.value);
    } catch (err) {
      console.error("Failed to fetch electricity data:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalKwh = analytics?.summary?.totalKwh || 0;
  const totalCost = analytics?.summary?.totalCost || 0;
  const avgKwh = analytics?.summary?.avgDaily || 0;
  const peakKwh = analytics?.summary?.peakPower || 0;
  const trend = analytics?.summary?.trend || 0;

  const chartData = (analytics?.daily || []).map((d) => ({
    day: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
    kwh: d.totalKwh,
    cost: d.totalCost,
  }));

  const stats = [
    {
      label: "Total This Week",
      value: `${Math.round(totalKwh)} kWh`,
      icon: Zap,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Total Cost",
      value: `₹${Math.round(totalCost).toLocaleString()}`,
      icon: IndianRupee,
      color: "text-accent bg-accent/10",
    },
    {
      label: "Daily Average",
      value: `${Math.round(avgKwh)} kWh`,
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Peak Load",
      value: `${Math.round(peakKwh)} kW`,
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink">Electricity Consumption</h1>
        <p className="text-sm text-ink-secondary mt-1">Monitor power usage and costs across meters</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-border p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color} mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-ink">{s.value}</p>
            <p className="text-sm text-ink-muted mt-1">{s.label}</p>
            {s.label === "Total This Week" && trend !== 0 && (
              <p className={`text-xs mt-1 ${trend > 0 ? "text-red-500" : "text-success"}`}>
                {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last week
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Consumption Chart */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Weekly Consumption & Cost</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-ink-muted">
              No consumption data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                <YAxis yAxisId="kwh" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  stroke="#94A3B8"
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value, name) => [
                    name === "kwh" ? `${value} kWh` : `₹${value}`,
                    name === "kwh" ? "Usage" : "Cost",
                  ]}
                />
                <Area
                  yAxisId="kwh"
                  type="monotone"
                  dataKey="kwh"
                  stroke="#D97706"
                  fill="#FEF3C7"
                  strokeWidth={2}
                  name="kwh"
                />
                <Area
                  yAxisId="cost"
                  type="monotone"
                  dataKey="cost"
                  stroke="#059669"
                  fill="#D1FAE5"
                  strokeWidth={2}
                  name="cost"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Meter Readings */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Meter Readings</h3>
          {meters.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">No meters configured</p>
          ) : (
            <div className="space-y-3">
              {meters.map((meter) => {
                const todayKwh = meter.latestReading?.dailyKwh || 0;
                const power = meter.latestReading?.powerKw || 0;
                const isHigh = todayKwh > 40; // Threshold for "high" usage

                return (
                  <div key={meter.id} className="p-3 rounded-lg bg-canvas border border-border-subtle">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-ink">{meter.meterNumber}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isHigh ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {isHigh ? "high" : "normal"}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted capitalize">{meter.meterType}</p>
                    <p className="text-lg font-bold text-ink mt-1">{todayKwh.toFixed(1)} kWh</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-ink-muted">
                        {power.toFixed(1)} kW · ₹{meter.costPerUnit}/unit
                      </p>
                      <p className="text-xs text-ink-muted">Today</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
