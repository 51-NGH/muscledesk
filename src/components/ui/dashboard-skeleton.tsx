import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSkeletonProps {
  type?: "admin" | "member";
}

export function DashboardSkeleton({ type = "admin" }: DashboardSkeletonProps) {
  if (type === "member") {
    return (
      <div className="space-y-5 animate-pulse">
        {/* Welcome Card Skeleton */}
        <div className="bg-primary/50 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24 bg-white/20" />
              <Skeleton className="h-8 w-48 bg-white/20" />
              <Skeleton className="h-5 w-20 bg-white/20" />
            </div>
            <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-white/20" />
          </div>
        </div>

        {/* Status Cards Skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        {/* Membership Period Skeleton */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-px w-8" />
            <div className="space-y-1 text-right">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20 mt-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-[280px]" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16 mt-2" />
          </div>
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
