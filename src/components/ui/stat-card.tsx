import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconVariant?: "teal" | "green" | "orange" | "red" | "blue";
  change?: number;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconVariant = "teal",
  change,
  className,
}: StatCardProps) {
  const iconVariants = {
    teal: "stat-icon-teal",
    green: "stat-icon-green",
    orange: "stat-icon-orange",
    red: "stat-icon-red",
    blue: "stat-icon-blue",
  };

  const glowVariants = {
    teal: "hover:stat-glow-teal",
    green: "hover:stat-glow-green",
    orange: "hover:stat-glow-orange",
    red: "hover:stat-glow-red",
    blue: "",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:border-primary/20",
        glowVariants[iconVariant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-transform duration-300 hover:scale-110",
            iconVariants[iconVariant]
          )}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs sm:text-sm",
              change >= 0 ? "change-positive" : "change-negative"
            )}
          >
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span>
              {change >= 0 ? "+" : ""}
              {change}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 sm:mt-4">
        <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{value}</p>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}