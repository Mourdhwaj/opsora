"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { UtensilsCrossed, ThumbsUp, Star, Calendar, Loader2 } from "lucide-react";

interface FoodMenu {
  id: string;
  mealType: string;
  date: string;
  items: string;
  status: string;
}

interface MyAttendance {
  id: string;
  date: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

const mealTimeMap: Record<string, string> = {
  breakfast: "7:30 - 9:00 AM",
  lunch: "12:30 - 2:00 PM",
  snacks: "5:00 - 6:00 PM",
  dinner: "8:00 - 9:30 PM",
};

const mealColorMap: Record<string, string> = {
  breakfast: "border-amber-200 bg-amber-50/50",
  lunch: "border-emerald-200 bg-emerald-50/50",
  dinner: "border-indigo-200 bg-indigo-50/50",
};

export default function TenantFoodPage() {
  const [activeTab, setActiveTab] = useState<"today" | "attendance">("today");
  const [menus, setMenus] = useState<FoodMenu[]>([]);
  const [attendance, setAttendance] = useState<MyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      const [menusData, attendanceData] = await Promise.allSettled([
        api.get<FoodMenu[]>(`/food/menus?date=${today}`),
        api.get<MyAttendance[]>("/food/attendance/my"),
      ]);

      if (menusData.status === "fulfilled") setMenus(menusData.value || []);
      if (attendanceData.status === "fulfilled") setAttendance(attendanceData.value || []);
    } catch (err) {
      console.error("Failed to fetch food data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (menuId: string) => {
    try {
      setVotingId(menuId);
      // Rate the meal with 5 stars (default positive vote)
      await api.post("/food/ratings", {
        foodMenuId: menuId,
        rating: 5,
        tags: "liked",
      });
    } catch (err) {
      console.error("Failed to vote:", err);
    } finally {
      setVotingId(null);
    }
  };

  const groupedMenus = menus.reduce<Record<string, FoodMenu[]>>((acc, menu) => {
    const type = menu.mealType || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(menu);
    return acc;
  }, {});

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = attendance.find((a) => a.date === today);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Food & Meals</h1>
        <p className="text-ink-secondary mt-1">View today&apos;s menu and your meal attendance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-canvas rounded-lg border border-border w-fit">
        {(["today", "attendance"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-surface text-ink shadow-sm" : "text-ink-secondary hover:text-ink"
            }`}
          >
            {tab === "today" ? "Today's Menu" : "My Attendance"}
          </button>
        ))}
      </div>

      {/* Today's Menu */}
      {activeTab === "today" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(groupedMenus).length === 0 ? (
            <div className="col-span-full bg-surface rounded-xl border border-border p-12 text-center">
              <UtensilsCrossed className="w-12 h-12 text-ink-muted/30 mx-auto mb-3" />
              <p className="text-ink-muted">No menu available for today</p>
              <p className="text-sm text-ink-muted/60 mt-1">Check back later</p>
            </div>
          ) : (
            Object.entries(groupedMenus).map(([mealType, items]) => (
              <div
                key={mealType}
                className={`rounded-xl bg-surface border p-5 ${
                  mealColorMap[mealType] || "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-accent" />
                    <h3 className="font-semibold text-ink capitalize">{mealType}</h3>
                  </div>
                  <span className="text-xs text-ink-muted">
                    {mealTimeMap[mealType] || "Time TBD"}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((menu) =>
                    menu.items.split(",").map((item, i) => (
                      <li
                        key={`${menu.id}-${i}`}
                        className="text-sm text-ink-secondary flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                        {item.trim()}
                      </li>
                    ))
                  )}
                </ul>
                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-xs text-ink-muted capitalize">{items[0]?.status}</span>
                  <button
                    onClick={() => items[0] && handleVote(items[0].id)}
                    disabled={votingId === items[0]?.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                  >
                    {votingId === items[0]?.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-3.5 h-3.5" />
                    )}
                    Vote this meal
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          {/* Today's Attendance */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Today&apos;s Attendance</h3>
            {todayAttendance ? (
              <div className="grid grid-cols-3 gap-3">
                {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                  <div
                    key={meal}
                    className={`p-3 rounded-lg border text-center ${
                      todayAttendance[meal] === "yes"
                        ? "border-success/30 bg-success/5"
                        : todayAttendance[meal] === "maybe"
                        ? "border-warning/30 bg-warning/5"
                        : "border-border bg-canvas"
                    }`}
                  >
                    <p className="text-xs text-ink-muted capitalize mb-1">{meal}</p>
                    <p
                      className={`text-sm font-medium ${
                        todayAttendance[meal] === "yes"
                          ? "text-success"
                          : todayAttendance[meal] === "maybe"
                          ? "text-warning"
                          : "text-ink-muted"
                      }`}
                    >
                      {todayAttendance[meal] === "yes"
                        ? "✓ Yes"
                        : todayAttendance[meal] === "maybe"
                        ? "? Maybe"
                        : "✗ No"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                No attendance recorded for today. Respond to the next food poll!
              </p>
            )}
          </div>

          {/* Recent Attendance History */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Recent Attendance</h3>
            {attendance.length === 0 ? (
              <p className="text-sm text-ink-muted">No attendance history yet</p>
            ) : (
              <div className="space-y-2">
                {attendance.slice(0, 7).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-canvas border border-border-subtle"
                  >
                    <span className="text-sm text-ink font-medium">
                      {new Date(record.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                        <span
                          key={meal}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            record[meal] === "yes"
                              ? "bg-success/10 text-success"
                              : record[meal] === "maybe"
                              ? "bg-warning/10 text-warning"
                              : "bg-gray-100 text-gray-400"
                          }`}
                          title={`${meal}: ${record[meal]}`}
                        >
                          {record[meal] === "yes" ? "✓" : record[meal] === "maybe" ? "?" : "✗"}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
