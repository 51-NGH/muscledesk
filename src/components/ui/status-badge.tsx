import * as React from "react";
import { cn } from "@/lib/utils";

type StatusType = "active" | "expiring" | "expiring_soon" | "expired" | "inactive" | "blocked" | "pending" | "completed" | "failed";
type PlanType = "premium" | "standard" | "basic" | "trial";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
}

interface PlanBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  plan: PlanType;
}

const statusLabels: Record<StatusType, string> = {
  active: "Active",
  expiring: "Expiring",
  expiring_soon: "Expiring",
  expired: "Expired",
  inactive: "Inactive",
  blocked: "Blocked",
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
};

const statusStyles: Record<StatusType, string> = {
  active: "status-active",
  expiring: "status-expiring",
  expiring_soon: "status-expiring",
  expired: "status-expired",
  inactive: "status-inactive",
  blocked: "status-expired",
  pending: "status-pending",
  completed: "status-completed",
  failed: "status-failed",
};

const planLabels: Record<PlanType, string> = {
  premium: "Premium",
  standard: "Standard",
  basic: "Basic",
  trial: "Trial",
};

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs",
          statusStyles[status],
          className
        )}
        {...props}
      >
        {statusLabels[status]}
      </span>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

const PlanBadge = React.forwardRef<HTMLSpanElement, PlanBadgeProps>(
  ({ plan, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs",
          `plan-${plan}`,
          className
        )}
        {...props}
      >
        {planLabels[plan]}
      </span>
    );
  }
);

PlanBadge.displayName = "PlanBadge";

export { StatusBadge, PlanBadge };
