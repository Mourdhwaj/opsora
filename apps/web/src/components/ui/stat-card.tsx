import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  variant?: "default" | "compact";
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-accent bg-accent-light",
  trend,
  subtitle,
  variant = "default",
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-xl border border-border",
        "transition-all duration-200 ease-out",
        "hover:shadow-[var(--shadow-card-hover)]",
        variant === "compact" ? "p-4" : "p-6",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
            {title}
          </p>
          <p
            className={cn(
              "font-bold text-ink tracking-tight",
              variant === "compact" ? "text-xl mt-1" : "text-[1.75rem] mt-2 leading-none"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-ink-muted mt-1.5">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 rounded-full text-xs font-semibold",
                trend.isPositive
                  ? "bg-success-light text-accent"
                  : "bg-danger-light text-danger"
              )}
            >
              {trend.isPositive ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                  <path d="M205.66 136.34a8 8 0 0 1-11.32 11.32L136 89.37V224a8 8 0 0 1-16 0V89.37l-58.34 58.29a8 8 0 0 1-11.32-11.32l72-72a8 8 0 0 1 11.32 0Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                  <path d="M205.66 119.66a8 8 0 0 1-11.32 0L136 61.37V196a8 8 0 0 1-16 0V61.37l-58.34 58.29a8 8 0 0 1-11.32-11.32l72-72a8 8 0 0 1 11.32 0Z" transform="rotate(180 128 128)" />
                </svg>
              )}
              <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            iconColor
          )}
        >
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

export { StatCard, type StatCardProps };
