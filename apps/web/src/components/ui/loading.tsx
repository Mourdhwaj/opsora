import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-lg animate-shimmer",
        className
      )}
    />
  );
}

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "border-2 border-accent border-t-transparent rounded-full animate-spin",
          sizes[size]
        )}
      />
    </div>
  );
}

interface LoadingPageProps {
  message?: string;
}

function LoadingPage({ message = "Loading..." }: LoadingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
}

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

function SkeletonCard({ lines = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-surface rounded-xl border border-border p-5", className)}>
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn("bg-surface rounded-xl border border-border overflow-hidden", className)}>
      <div className="p-4 border-b border-border">
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export {
  Skeleton,
  LoadingSpinner,
  LoadingPage,
  SkeletonCard,
  SkeletonTable,
};
