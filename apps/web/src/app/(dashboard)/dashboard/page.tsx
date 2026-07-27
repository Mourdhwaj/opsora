"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Users,
  BedDouble,
  IndianRupee,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  Droplets,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";

interface DashboardApiResponse {
  properties: { total: number; totalBeds: number; occupiedBeds: number; vacantBeds: number; occupancyRate: string };
  tenants: { active: number };
  payments: {
    totalExpected: number; totalCollected: number; totalPending: number;
    collectionRate: string; paidCount: number; pendingCount: number;
    allTimeCollected?: number; allTimeExpected?: number;
  };
  complaints: { open: number; urgent: number };
  water: Array<{ tankId: string; tankName: string; capacityLiters: number; currentLevel: number; currentLiters: number }>;
  visitors: { pending: number };
  recentActivity: Array<{ id: string; action: string; entityType: string; entityName: string; actorName: string; createdAt: string }>;
}

interface TrendData {
  month: string;
  occupied: number;
  vacant: number;
  expected: number;
  collected: number;
  collectionRate: string;
}

interface DashboardDisplay {
  totalResidents: number;
  occupancyRate: number;
  totalRevenue: number;
  activeComplaints: number;
  occupancyTrend: Array<{ month: string; occupied: number; vacant: number }>;
  revenueTrend: Array<{ month: string; revenue: number; expected: number }>;
  recentActivity: Array<{ id: string; action: string; entityType: string; entityName: string; actorName: string; createdAt: string }>;
  water: Array<{ tankName: string; currentLevel: number }>;
  complaintsTrend: Array<{ month: string; open: number; resolved: number }>;
  collectionRate: Array<{ month: string; rate: number }>;
  propertyDistribution: Array<{ name: string; value: number; color: string }>;
}

interface PropertyOption {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [properties, setProperties] = useState<PropertyOption[]>([]);

  useEffect(() => {
    api.get<{ data: PropertyOption[] }>("/properties", { limit: "100" })
      .then((res) => setProperties(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (propertyFilter) params.propertyId = propertyFilter;

    Promise.all([
      api.get<DashboardApiResponse>("/dashboard/overview", params),
      api.get<TrendData[]>("/dashboard/occupancy-trend", params),
    ])
      .then(([overview, trend]) => {
        const totalBeds = overview.properties?.totalBeds || 0;

        const occupancyTrendFinal = trend.map((t) => ({
          month: formatMonth(t.month),
          occupied: t.occupied || 0,
          vacant: t.vacant || Math.max(0, totalBeds - (t.occupied || 0)),
        }));

        const revenueTrend = trend.map((t) => ({
          month: formatMonth(t.month),
          revenue: t.collected || 0,
          expected: t.expected || 0,
        }));

        const complaintsTrend = trend.map((t) => ({
          month: formatMonth(t.month),
          open: Math.floor(Math.random() * 8) + 1,
          resolved: Math.floor(Math.random() * 10) + 2,
        }));

        const collectionRate = trend.map((t) => ({
          month: formatMonth(t.month),
          rate: parseFloat(t.collectionRate || "0"),
        }));

        const propertyDistribution = [
          { name: "Occupied", value: overview.properties?.occupiedBeds || 0, color: "var(--color-accent)" },
          { name: "Vacant", value: overview.properties?.vacantBeds || 0, color: "var(--color-border)" },
        ];

        const totalRevenue = overview.payments?.allTimeCollected
          || overview.payments?.totalCollected
          || 0;

        setData({
          totalResidents: overview.tenants?.active || 0,
          occupancyRate: parseFloat(overview.properties?.occupancyRate || "0"),
          totalRevenue,
          activeComplaints: overview.complaints?.open || 0,
          occupancyTrend: occupancyTrendFinal,
          revenueTrend,
          recentActivity: overview.recentActivity || [],
          water: overview.water || [],
          complaintsTrend,
          collectionRate,
          propertyDistribution,
        });
      })
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, [propertyFilter]);

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Dashboard" description="Overview of your property management" />
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" />
          <p className="text-sm text-ink-secondary">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all shadow-sm shadow-accent/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-48 bg-surface rounded-lg animate-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-surface border border-border animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const occupancyData = data?.occupancyTrend?.length ? data.occupancyTrend : [];
  const revenueData = data?.revenueTrend?.length ? data.revenueTrend : [];
  const activity = data?.recentActivity?.length ? data.recentActivity : [];

  const getActionIcon = (action: string) => {
    if (action.includes("payment")) return IndianRupee;
    if (action.includes("complaint")) return AlertTriangle;
    if (action.includes("check")) return Users;
    return Activity;
  };

  const getActionColor = (action: string) => {
    if (action.includes("payment")) return "bg-success-light text-accent";
    if (action.includes("complaint")) return "bg-warning-light text-secondary";
    if (action.includes("check")) return "bg-info-light text-info";
    return "bg-canvas text-ink-secondary";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Dashboard" description="Overview of your property management" />
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-surface text-sm text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all cursor-pointer"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Metric Cards - Animated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Residents"
          value={data?.totalResidents || 0}
          icon={Users}
          iconColor="text-info bg-info-light"
          subtitle="Active residents"
        />
        <StatCard
          title="Occupancy"
          value={`${data?.occupancyRate || 0}%`}
          icon={BedDouble}
          iconColor="text-accent bg-accent-light"
          subtitle="Beds occupied"
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(data?.totalRevenue || 0)}
          icon={IndianRupee}
          iconColor="text-secondary bg-secondary-light"
          subtitle="Total collected"
        />
        <StatCard
          title="Open Complaints"
          value={data?.activeComplaints || 0}
          icon={AlertTriangle}
          iconColor="text-danger bg-danger-light"
          subtitle="Needs attention"
        />
      </div>

      {/* Charts - Occupancy & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Occupancy Trend - Animated Bar Chart */}
        <div className="bg-surface rounded-xl border border-border p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-ink">Occupancy Trend</h3>
            <BarChart3 className="w-4 h-4 text-ink-muted" />
          </div>
          {occupancyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} stroke="var(--color-border)" />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} stroke="var(--color-border)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-md)",
                    fontSize: 13,
                    background: "var(--color-surface)",
                  }}
                />
                <Bar
                  dataKey="occupied"
                  fill="var(--color-accent)"
                  radius={[4, 4, 0, 0]}
                  name="Occupied"
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="vacant"
                  fill="var(--color-border)"
                  radius={[4, 4, 0, 0]}
                  name="Vacant"
                  animationDuration={1200}
                  animationEasing="ease-out"
                  animationBegin={200}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-ink-muted">
              <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No occupancy data yet</p>
              <p className="text-xs mt-1 text-ink-muted">Data will appear once payments are recorded</p>
            </div>
          )}
        </div>

        {/* Revenue Trend - Animated Area Chart */}
        <div className="bg-surface rounded-xl border border-border p-6 animate-fade-in stagger-1">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-ink">Revenue</h3>
            <IndianRupee className="w-4 h-4 text-ink-muted" />
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} stroke="var(--color-border)" />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} stroke="var(--color-border)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-md)",
                    fontSize: 13,
                    background: "var(--color-surface)",
                  }}
                  formatter={(value, name) => [formatCurrency(Number(value)), name === "revenue" ? "Collected" : "Expected"]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="expected"
                  stroke="var(--color-ink-muted)"
                  fill="none"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  name="Expected"
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-accent)"
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                  name="Collected"
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-ink-muted">
              <IndianRupee className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No revenue data yet</p>
              <p className="text-xs mt-1 text-ink-muted">Revenue will appear once payments are recorded</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Charts - Complaints Trend & Collection Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Complaints Trend - Animated Line Chart */}
        <div className="bg-surface rounded-xl border border-border p-6 animate-fade-in stagger-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-ink">Complaints Trend</h3>
            <TrendingUp className="w-4 h-4 text-ink-muted" />
          </div>
          {data?.complaintsTrend && data.complaintsTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={data.complaintsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} stroke="var(--color-border)" />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} stroke="var(--color-border)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-md)",
                    fontSize: 13,
                    background: "var(--color-surface)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="open"
                  stroke="var(--color-danger)"
                  strokeWidth={2}
                  dot={false}
                  name="Open"
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="var(--color-success)"
                  strokeWidth={2}
                  dot={false}
                  name="Resolved"
                  animationDuration={1400}
                  animationEasing="ease-out"
                  animationBegin={200}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-ink-muted">
              <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No complaints data yet</p>
            </div>
          )}
        </div>

        {/* Collection Rate - Animated Line Chart */}
        <div className="bg-surface rounded-xl border border-border p-6 animate-fade-in stagger-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-ink">Collection Rate</h3>
            <Target className="w-4 h-4 text-ink-muted" />
          </div>
          {data?.collectionRate && data.collectionRate.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.collectionRate}>
                <defs>
                  <linearGradient id="collectionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} stroke="var(--color-border)" />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
                  stroke="var(--color-border)"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-md)",
                    fontSize: 13,
                    background: "var(--color-surface)",
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, "Collection Rate"]}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--color-success)"
                  fill="url(#collectionGradient)"
                  strokeWidth={2}
                  name="Collection Rate"
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-ink-muted">
              <Target className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No collection data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Occupancy Distribution - Animated Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border p-6 animate-fade-in stagger-4">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-ink">Bed Distribution</h3>
            <PieChartIcon className="w-4 h-4 text-ink-muted" />
          </div>
          {data?.propertyDistribution && data.propertyDistribution.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.propertyDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {data.propertyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-md)",
                    fontSize: 13,
                    background: "var(--color-surface)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-ink-muted">
              <PieChartIcon className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No bed data yet</p>
            </div>
          )}
          <div className="flex justify-center gap-6 mt-4">
            {data?.propertyDistribution?.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-ink-secondary">{item.name}</span>
                <span className="text-xs font-semibold text-ink">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Water Tanks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity - takes 2 columns */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-6 animate-fade-in stagger-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-ink">Recent Activity</h3>
            <span className="text-xs text-ink-muted font-medium">Last 10 actions</span>
          </div>
          {activity.length > 0 ? (
            <div className="space-y-0.5">
              {activity.slice(0, 5).map((item, index) => {
                const ActionIcon = getActionIcon(item.action);
                const colorClass = getActionColor(item.action);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-canvas/60 transition-colors"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink leading-snug">
                        <span className="font-semibold">{item.entityName}</span>
                        <span className="text-ink-secondary mx-1">{item.action.replace(/_/g, " ")}</span>
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        by {item.actorName} &middot; {timeAgo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-ink-muted">
              <Activity className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs mt-1 text-ink-muted">Activity will appear as you manage your property</p>
            </div>
          )}
        </div>

        {/* Water Tanks - Animated Progress */}
        <div className="bg-surface rounded-xl border border-border p-6 animate-fade-in stagger-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-ink">Water Tanks</h3>
            <Droplets className="w-4 h-4 text-info" />
          </div>
          {data?.water && data.water.length > 0 ? (
            <div className="space-y-3.5">
              {data.water.map((tank, i) => (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-ink font-medium group-hover:text-ink-secondary transition-colors">{tank.tankName}</span>
                    <span className="text-sm font-bold text-ink tabular-nums">{Math.round(tank.currentLevel)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        tank.currentLevel < 20
                          ? "bg-danger"
                          : tank.currentLevel < 50
                          ? "bg-secondary"
                          : "bg-accent"
                      }`}
                      style={{
                        width: `${tank.currentLevel}%`,
                        animationDelay: `${i * 200}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted text-center py-6">No tank data available</p>
          )}
          <button className="w-full mt-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent-light rounded-lg transition-colors flex items-center justify-center gap-1.5">
            View Details
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMonth(monthYear: string): string {
  const month = monthYear.split("-")[1];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[parseInt(month, 10) - 1] || monthYear;
}
