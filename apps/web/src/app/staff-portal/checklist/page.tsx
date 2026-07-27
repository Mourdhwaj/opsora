"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { CheckCircle, Circle, CheckSquare } from "lucide-react";

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

const defaultChecklist: ChecklistItem[] = [
  { id: "1", task: "Check all floor bathrooms are clean", completed: false },
  { id: "2", task: "Verify common area is tidy", completed: false },
  { id: "3", task: "Check water levels in tanks", completed: false },
  { id: "4", task: "Inspect entrance and security", completed: false },
  { id: "5", task: "Review pending complaints", completed: false },
  { id: "6", task: "Check kitchen supplies", completed: false },
  { id: "7", task: "Verify visitor log is updated", completed: false },
  { id: "8", task: "Report any maintenance issues", completed: false },
];

export default function StaffChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load checklist from localStorage or use defaults
    const saved = localStorage.getItem(`checklist_${new Date().toISOString().slice(0, 10)}`);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        setItems(defaultChecklist);
      }
    } else {
      setItems(defaultChecklist);
    }
    setLoading(false);
  }, []);

  const toggle = (id: string) => {
    setItems((prev) => {
      const updated = prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i));
      // Save to localStorage for persistence across page refreshes
      localStorage.setItem(`checklist_${new Date().toISOString().slice(0, 10)}`, JSON.stringify(updated));
      return updated;
    });
  };

  const completed = items.filter((i) => i.completed).length;
  const progress = Math.round((completed / items.length) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Daily Checklist</h1>
        <p className="text-ink-secondary mt-1">Complete your daily duties</p>
      </div>

      {/* Progress Card */}
      <div className="rounded-xl bg-surface border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-ink">
            {completed} of {items.length} completed
          </span>
          <span className={`text-sm font-bold ${progress === 100 ? "text-success" : "text-accent"}`}>
            {progress}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-canvas rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress === 100 ? "bg-success" : "bg-accent"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <div className="mt-3 flex items-center gap-2 text-success text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            All tasks completed! Great job today.
          </div>
        )}
      </div>

      {/* Checklist Items */}
      <div className="rounded-xl bg-surface border border-border divide-y divide-border-subtle">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-canvas/50 transition-colors"
          >
            {item.completed ? (
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-ink-muted flex-shrink-0" />
            )}
            <span
              className={`text-sm font-medium ${
                item.completed ? "text-ink-muted line-through" : "text-ink"
              }`}
            >
              {item.task}
            </span>
          </button>
        ))}
      </div>

      {/* Reset Button */}
      {completed > 0 && (
        <button
          onClick={() => {
            const reset = items.map((i) => ({ ...i, completed: false }));
            setItems(reset);
            localStorage.removeItem(`checklist_${new Date().toISOString().slice(0, 10)}`);
          }}
          className="text-sm text-ink-muted hover:text-danger transition-colors"
        >
          Reset checklist for today
        </button>
      )}
    </div>
  );
}
