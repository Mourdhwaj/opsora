"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Droplets, TrendingDown, AlertTriangle, Truck, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WaterTank {
  id: string;
  name: string;
  tankType: string;
  capacityLiters: number;
  lowLevelAlert: number;
  criticalLevelAlert: number;
  latestReading?: {
    levelPercentage: number;
    levelLiters: number;
    time: string;
  } | null;
}

interface WaterAnalytics {
  tanks: { id: string; name: string; capacityLiters: number }[];
  summary: { totalConsumption: number; avgDaily: number; avgLevel: number };
  daily: { date: string; totalConsumption: number; avgLevel: number }[];
}

interface TankerOrder {
  id: string;
  orderDate: string;
  orderedLiters: number;
  status: string;
}

export default function WaterIoTPage() {
  const [tanks, setTanks] = useState<WaterTank[]>([]);
  const [analytics, setAnalytics] = useState<WaterAnalytics | null>(null);
  const [tankerOrders, setTankerOrders] = useState<TankerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [tanksData, analyticsData] = await Promise.allSettled([
        api.get<WaterTank[]>("/water-tanks"),
        api.get<WaterAnalytics>("/iot/analytics/water?days=7"),
      ]);

      if (tanksData.status === "fulfilled") setTanks(tanksData.value || []);
      if (analyticsData.status === "fulfilled") setAnalytics(analyticsData.value);
    } catch (err) {
      console.error("Failed to fetch water data:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalConsumption = analytics?.summary?.totalConsumption || 0;
  const avgDaily = analytics?.summary?.avgDaily || 0;
  const lowAlerts = tanks.filter(
    (t) => (t.latestReading?.levelPercentage || 0) < (t.lowLevelAlert || 20)
  ).length;

  const chartData = (analytics?.daily || []).map((d) => ({
    day: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
    liters: d.totalConsumption,
  }));

  const stats = [
    {
      label: "Total This Week",
      value: `${totalConsumption.toLocaleString()} L`,
      icon: Droplets,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Daily Average",
      value: `${Math.round(avgDaily).toLocaleString()} L`,
      icon: TrendingDown,
      color: "text-accent bg-accent/10",
    },
    {
      label: "Tanker Orders",
      value: `${tankerOrders.length}`,
      icon: Truck,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Low Alerts",
      value: `${lowAlerts}`,
      icon: AlertTriangle,
      color: lowAlerts > 0 ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-50",
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
        <h1 className="text-2xl font-bold text-ink">Water Consumption</h1>
        <p className="text-sm text-ink-secondary mt-1">Monitor tank levels and water usage</p>
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
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tank Levels */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Tank Levels</h3>
          {tanks.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">No tanks configured</p>
          ) : (
            <div className="space-y-4">
              {tanks.map((tank) => {
                const level = tank.latestReading?.levelPercentage || 0;
                const liters = tank.latestReading?.levelLiters || 0;
                const color =
                  level < (tank.criticalLevelAlert || 10)
                    ? "bg-red-500"
                    : level < (tank.lowLevelAlert || 20)
                    ? "bg-amber-500"
                    : "bg-blue-500";

                return (
                  <div key={tank.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-ink">{tank.name}</span>
                      <span className="text-sm font-medium text-ink">{level}%</span>
                    </div>
                    <div className="h-3 bg-canvas rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${level}%` }}
                      />
                    </div>
                    <p className="text-xs text-ink-muted mt-1">
                      {liters.toLocaleString()} / {tank.capacityLiters.toLocaleString()} L
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Consumption Chart */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Weekly Consumption</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-ink-muted">
              No consumption data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#94A3B8"
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString()} L`, "Consumption"]}
                />
                <Line
                  type="monotone"
                  dataKey="liters"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ fill: "#2563EB", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
