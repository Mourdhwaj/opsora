"use client";

import { cn } from "@/lib/utils";
import { X, CheckCircle, XCircle, Info, Warning } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle weight="bold" size={20} />,
  error: <XCircle weight="bold" size={20} />,
  info: <Info weight="bold" size={20} />,
  warning: <Warning weight="bold" size={20} />,
};

const styles: Record<ToastType, string> = {
  success: "bg-[#EDF3EC] border-[#EDF3EC] text-[#346538]",
  error: "bg-[#FDEBEC] border-[#FDEBEC] text-[#9F2F2D]",
  info: "bg-[#E1F3FE] border-[#E1F3FE] text-[#1F6C9F]",
  warning: "bg-[#FBF3DB] border-[#FBF3DB] text-[#956400]",
};

function Toast({ type, message, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border shadow-[0_4px_12px_rgba(0,0,0,0.04)] animate-slide-in-right min-w-[300px] max-w-[400px]",
        styles[type]
      )}
    >
      <span className="flex-shrink-0 mt-0.5">{icons[type]}</span>
      <p className="flex-1 text-sm font-medium text-[#111111]">{message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-black/5 transition-colors text-[#787774]"
      >
        <X weight="bold" size={16} />
      </button>
    </div>
  );
}

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-toast flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    addToast,
    removeToast,
    success: (message: string) => addToast("success", message),
    error: (message: string) => addToast("error", message),
    info: (message: string) => addToast("info", message),
    warning: (message: string) => addToast("warning", message),
  };
}

export { Toast, ToastContainer, useToast, type ToastType, type ToastItem };
