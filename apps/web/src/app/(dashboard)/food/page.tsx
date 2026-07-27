"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { UtensilsCrossed, Coffee, Sun, Moon, Users, Star, Loader2 } from "lucide-react";

interface FoodMenu {
  id: string;
  mealType: string;
  date: string;
  items: string;
  status: string;
  attendanceCount?: number;
  predictedCount?: number;
}

interface FoodPoll {
  id: string;
  title: string;
  mealType: string;
  date: string;
  status: string;
  totalVotes: number;
  options: { id: string; title: string; voteCount: number }[];
}

interface RatingsSummary {
  avgRating: string;
  totalRatings: number;
  complaintTags: { tag: string; count: number }[];
}

const mealIcons: Record<string, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
};

const mealColors: Record<string, string> = {
  breakfast: "text-amber-600 bg-amber-50",
  lunch: "text-emerald-600 bg-emerald-50",
  dinner: "text-indigo-600 bg-indigo-50",
};

export default function FoodPage() {
  const [menus, setMenus] = useState<FoodMenu[]>([]);
  const [polls, setPolls] = useState<FoodPoll[]>([]);
  const [ratings, setRatings] = useState<RatingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMeal, setActiveMeal] = useState("lunch");
  const [activeTab, setActiveTab] = useState<"menu" | "polls" | "analytics">("menu");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      const [menusData, pollsData, ratingsData] = await Promise.allSettled([
        api.get<FoodMenu[]>(`/food/menus?date=${today}`),
        api.get<{ data: FoodPoll[] }>("/food/polls?status=published"),
        api.get<RatingsSummary>("/food/ratings/summary"),
      ]);

      if (menusData.status === "fulfilled") setMenus(menusData.value || []);
      if (pollsData.status === "fulfilled") setPolls(pollsData.value?.data || []);
      if (ratingsData.status === "fulfilled") setRatings(ratingsData.value);
    } catch (err) {
      console.error("Failed to fetch food data:", err);
    } finally {
      setLoading(false);
    }
  };

  const groupedMenus = menus.reduce<Record<string, FoodMenu[]>>((acc, menu) => {
    const type = menu.mealType || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(menu);
    return acc;
  }, {});

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        <h1 className="text-2xl font-bold text-ink">Food & Meals</h1>
        <p className="text-sm text-ink-secondary mt-1">{todayStr}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-canvas rounded-lg border border-border w-fit">
        {(["menu", "polls", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize",
              activeTab === tab ? "bg-surface text-ink shadow-sm" : "text-ink-secondary hover:text-ink"
            )}
          >
            {tab === "menu" ? "Today's Menu" : tab === "polls" ? "Active Polls" : "Analytics"}
          </button>
        ))}
      </div>

      {/* Menu Tab */}
      {activeTab === "menu" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {Object.keys(groupedMenus).length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center">
                <UtensilsCrossed className="w-12 h-12 text-ink-muted/30 mx-auto mb-3" />
                <p className="text-ink-muted">No menu set for today</p>
                <p className="text-sm text-ink-muted/60 mt-1">
                  Create a food poll or set the menu manually
                </p>
              </div>
            ) : (
              Object.entries(groupedMenus).map(([mealType, items]) => {
                const Icon = mealIcons[mealType] || UtensilsCrossed;
                const color = mealColors[mealType] || "text-gray-600 bg-gray-50";
                return (
                  <div key={mealType} className="bg-surface rounded-xl border border-border p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink capitalize">{mealType}</h3>
                        <p className="text-xs text-ink-muted">
                          {items.map((i) => i.attendanceCount || 0).reduce((a, b) => a + b, 0)} attendees
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {items.map((menu) => (
                        <div key={menu.id} className="p-3 rounded-lg bg-canvas border border-border-subtle">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-ink">{menu.items}</p>
                              <p className="text-xs text-ink-muted mt-1">
                                Status: <span className="capitalize">{menu.status}</span>
                              </p>
                            </div>
                            {menu.predictedCount && (
                              <span className="text-xs text-ink-muted bg-canvas px-2 py-1 rounded">
                                ~{menu.predictedCount} expected
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="bg-surface rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-muted">Avg Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-ink">
                      {ratings?.avgRating || "0"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-muted">Total Ratings</span>
                  <span className="text-sm font-medium text-ink">{ratings?.totalRatings || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-muted">Menus Today</span>
                  <span className="text-sm font-medium text-ink">{menus.length}</span>
                </div>
              </div>
            </div>

            {/* Common Tags */}
            {ratings?.complaintTags && ratings.complaintTags.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-ink mb-3">Feedback Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {ratings.complaintTags.slice(0, 8).map((tag) => (
                    <span
                      key={tag.tag}
                      className="px-2 py-1 rounded-full bg-canvas text-xs text-ink-secondary border border-border-subtle"
                    >
                      {tag.tag} ({tag.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Polls Tab */}
      {activeTab === "polls" && (
        <div className="space-y-4">
          {polls.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-12 text-center">
              <Users className="w-12 h-12 text-ink-muted/30 mx-auto mb-3" />
              <p className="text-ink-muted">No active polls</p>
              <p className="text-sm text-ink-muted/60 mt-1">Create a poll to let residents vote on meals</p>
            </div>
          ) : (
            polls.map((poll) => {
              const maxVotes = Math.max(...poll.options.map((o) => o.voteCount || 0), 1);
              return (
                <div key={poll.id} className="bg-surface rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-ink">{poll.title}</h3>
                      <p className="text-sm text-ink-secondary capitalize">
                        {poll.mealType} · {poll.date}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <div className="space-y-3">
                    {poll.options.map((option) => (
                      <div key={option.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-ink">{option.title}</span>
                          <span className="text-sm text-ink-muted">{option.voteCount} votes</span>
                        </div>
                        <div className="w-full h-2 bg-canvas rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{
                              width: `${maxVotes > 0 ? ((option.voteCount || 0) / maxVotes) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-ink-muted">
                    Total: {poll.totalVotes} votes
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Satisfaction Score</h3>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-success">{ratings?.avgRating || "0"}</span>
              </div>
              <div>
                <p className="text-sm text-ink-muted">Based on {ratings?.totalRatings || 0} ratings</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(parseFloat(ratings?.avgRating || "0"))
                          ? "text-amber-500 fill-amber-500"
                          : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Popular Tags</h3>
            {ratings?.complaintTags && ratings.complaintTags.length > 0 ? (
              <div className="space-y-2">
                {ratings.complaintTags.slice(0, 5).map((tag) => (
                  <div key={tag.tag} className="flex items-center justify-between">
                    <span className="text-sm text-ink">{tag.tag}</span>
                    <span className="text-sm text-ink-muted">{tag.count} mentions</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No feedback tags yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
