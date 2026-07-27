import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: ReactNode;
  breadcrumbs?: { label: string; href?: string; onClick?: () => void }[];
  className?: string;
}

function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-xs text-ink-muted">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-ink-faint">/</span>}
              {crumb.href || crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="hover:text-ink transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-ink font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center">
              <Icon className="w-5 h-5 text-accent" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-ink-secondary mt-1">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export { PageHeader, type PageHeaderProps };
