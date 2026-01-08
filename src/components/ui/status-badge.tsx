import { cn } from "@/lib/utils";

type StatusType = "active" | "expiring" | "expired" | "inactive" | "pending" | "completed" | "failed";
type PlanType = "premium" | "standard" | "basic" | "trial";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

interface PlanBadgeProps {
  plan: PlanType;
  className?: string;
}

const statusLabels: Record<StatusType, string> = {
  active: "Active",
  expiring: "Expiring",
  expired: "Expired",
  inactive: "Inactive",
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
};

const planLabels: Record<PlanType, string> = {
  premium: "Premium",
  standard: "Standard",
  basic: "Basic",
  trial: "Trial",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs",
        `status-${status}`,
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs",
        `plan-${plan}`,
        className
      )}
    >
      {planLabels[plan]}
    </span>
  );
}
