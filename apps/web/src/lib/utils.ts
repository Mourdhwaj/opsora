import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function timeAgo(dateString: string): string {
  if (!dateString) return "";
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  const months = Math.floor(diff / 2592000000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mo ago`;
}

export function getStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status.toLowerCase()) {
    case "active":
    case "paid":
    case "confirmed":
    case "resolved":
    case "closed":
    case "completed":
      return {
        bg: "bg-success-light",
        text: "text-success",
        border: "border-success/20",
      };
    case "pending":
    case "in_progress":
    case "draft":
      return {
        bg: "bg-warning-light",
        text: "text-warning",
        border: "border-warning/20",
      };
    case "overdue":
    case "breached":
    case "urgent":
    case "high":
      return {
        bg: "bg-danger-light",
        text: "text-danger",
        border: "border-danger/20",
      };
    case "open":
    case "new":
      return {
        bg: "bg-info-light",
        text: "text-info",
        border: "border-info/20",
      };
    case "partial":
      return {
        bg: "bg-warning-light",
        text: "text-warning",
        border: "border-warning/20",
      };
    case "checked_out":
    case "inactive":
    case "cancelled":
      return {
        bg: "bg-gray-100",
        text: "text-gray-600",
        border: "border-gray-200",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-600",
        border: "border-gray-200",
      };
  }
}
