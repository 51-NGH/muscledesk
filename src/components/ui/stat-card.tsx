import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconVariant?: "teal" | "green" | "orange" | "red" | "blue";
  change?: number;
  className?: string;
}

export function StatCard({
  title,
  value,
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

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconVariants[iconVariant])}>
          <Icon className="h-6 w-6" />
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-sm", change >= 0 ? "change-positive" : "change-negative")}>
            {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{change >= 0 ? "+" : ""}{change}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}
