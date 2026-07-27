"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CheckCircle, Circle, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  scheduledDate?: string;
  completedAt?: string;
  createdAt: string;
}

const priorityConfig: Record<string, { color: string; icon: typeof AlertTriangle }> = {
  high: { color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  medium: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
  low: { color: "bg-gray-100 text-gray-600", icon: Circle },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  completed: { color: "bg-success/10 text-success", label: "Completed" },
  pending: { color: "bg-warning/10 text-warning", label: "Pending" },
  in_progress: { color: "bg-info/10 text-info", label: "In Progress" },
};

export default function StaffTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.get<Task[]>("/staff/tasks");
      setTasks(data || []);
    } catch (err) {
      setError("Failed to load tasks");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === "completed") return;

    try {
      setCompletingId(id);
      await api.patch(`/staff/tasks/${id}/complete`, {});
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: "completed", completedAt: new Date().toISOString() } : t
        )
      );
    } catch (err) {
      console.error("Failed to complete task:", err);
    } finally {
      setCompletingId(null);
    }
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

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
        <h1 className="text-2xl font-bold text-ink">My Tasks</h1>
        <p className="text-ink-secondary mt-1">Manage your assigned tasks</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-canvas rounded-lg border border-border w-fit">
        {(["all", "pending", "in_progress", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f ? "bg-surface text-ink shadow-sm" : "text-ink-secondary hover:text-ink"
            }`}
          >
            {f.replace("_", " ")}
            <span className="ml-1.5 text-xs opacity-60">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-surface border border-border p-12 text-center">
          <CheckCircle className="w-12 h-12 text-success/30 mx-auto mb-3" />
          <p className="text-ink-muted">
            {filter === "all" ? "No tasks assigned yet" : `No ${filter.replace("_", " ")} tasks`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-surface border border-border divide-y divide-border-subtle">
          {filtered.map((task) => {
            const priority = priorityConfig[task.priority] || priorityConfig.low;
            const status = statusConfig[task.status] || statusConfig.pending;
            const isCompleting = completingId === task.id;

            return (
              <div
                key={task.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-canvas/50 transition-colors"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  disabled={task.status === "completed" || isCompleting}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    task.status === "completed"
                      ? "bg-success border-success text-white"
                      : "border-ink-muted hover:border-accent"
                  }`}
                >
                  {isCompleting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : task.status === "completed" ? (
                    <span className="text-xs">✓</span>
                  ) : null}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      task.status === "completed" ? "text-ink-muted line-through" : "text-ink"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-ink-muted mt-0.5 truncate">{task.description}</p>
                  )}
                  {task.scheduledDate && (
                    <p className="text-xs text-ink-muted mt-0.5">
                      Due: {new Date(task.scheduledDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${priority.color}`}
                >
                  {task.priority}
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${status.color}`}
                >
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
