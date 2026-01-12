import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { PushNotificationSettings } from "@/components/member-portal/PushNotificationSettings";
import { format, differenceInDays, parseISO } from "date-fns";
import { 
  User, 
  CreditCard, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Target,
  Flame,
  Award,
  ChevronRight
} from "lucide-react";

export default function MemberDashboard() {
  const { member, loading, memberLoading } = useMemberAuth();

  // Show skeleton while loading session or member data
  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Dashboard">
        <DashboardSkeleton type="member" />
      </MemberLayout>
    );
  }

  const expiryDate = parseISO(member.expiry_date);
  const daysRemaining = differenceInDays(expiryDate, new Date());
  const isExpired = daysRemaining < 0;

  // Calculate streak (simplified - just using total visits)
  const currentStreak = Math.min(member.total_visits, 30);
  const streakLevel = currentStreak >= 20 ? "🔥 On Fire!" : currentStreak >= 10 ? "⚡ Great!" : currentStreak >= 5 ? "💪 Nice!" : "🌱 Getting Started";

  return (
    <MemberLayout title="Dashboard">
      <div className="space-y-5 animate-fade-in">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 sm:p-6 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-primary-foreground/70 text-sm">Welcome back,</p>
              <h1 className="text-xl sm:text-2xl font-bold mt-1 truncate">{member.full_name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs sm:text-sm text-primary-foreground/80 bg-primary-foreground/10 px-2 py-0.5 rounded-full">
                  ID: {member.member_id}
                </span>
              </div>
            </div>
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-primary-foreground/10 flex items-center justify-center shrink-0">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover" />
              ) : (
                <User className="h-7 w-7 sm:h-8 sm:w-8" />
              )}
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Membership Status */}
          <div className="bg-card rounded-xl border border-border p-4 animate-slide-up stagger-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-2">
              <Award className="h-4 w-4" />
              <span>Status</span>
            </div>
            <StatusBadge status={member.status} />
            {!isExpired && member.status !== "blocked" && (
              <p className="text-xs text-muted-foreground mt-2">
                {daysRemaining} days left
              </p>
            )}
          </div>

          {/* Plan */}
          <div className="bg-card rounded-xl border border-border p-4 animate-slide-up stagger-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-2">
              <CreditCard className="h-4 w-4" />
              <span>Plan</span>
            </div>
            <p className="font-semibold text-sm sm:text-base truncate">{member.plan_name || "Standard"}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Since {format(parseISO(member.start_date), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Membership Dates */}
        <div className="bg-card rounded-xl border border-border p-4 animate-slide-up stagger-3">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Membership Period
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium text-sm sm:text-base">{format(parseISO(member.start_date), "MMM d, yyyy")}</p>
            </div>
            <div className="h-px w-6 sm:w-8 bg-border" />
            <div className="text-right">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Expiry Date</p>
              <p className={`font-medium text-sm sm:text-base ${isExpired ? "text-destructive" : ""}`}>
                {format(expiryDate, "MMM d, yyyy")}
              </p>
            </div>
          </div>
          {!isExpired && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground mb-1.5">
                <span>Progress</span>
                <span>{Math.max(0, Math.round((1 - daysRemaining / 30) * 100))}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (1 - daysRemaining / 30) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Total Visits */}
          <div className="bg-card rounded-xl border border-border p-4 animate-slide-up stagger-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-3">
              <TrendingUp className="h-4 w-4" />
              <span>Total Visits</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{member.total_visits}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
              {member.last_visit_at 
                ? `Last: ${format(parseISO(member.last_visit_at), "MMM d")}`
                : "No visits yet"}
            </p>
          </div>

          {/* Streak */}
          <div className="bg-card rounded-xl border border-border p-4 animate-slide-up stagger-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-3">
              <Flame className="h-4 w-4" />
              <span>Streak</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{currentStreak}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{streakLevel}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground px-1">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={() => window.location.href = "/member/qr"}
              className="bg-card rounded-xl border border-border p-4 text-left hover:border-primary/50 active:scale-[0.98] transition-all flex items-center gap-4"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">QR Code</p>
                <p className="text-xs text-muted-foreground">Scan for check-in</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button 
              onClick={() => window.location.href = "/member/attendance"}
              className="bg-card rounded-xl border border-border p-4 text-left hover:border-primary/50 active:scale-[0.98] transition-all flex items-center gap-4"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Attendance</p>
                <p className="text-xs text-muted-foreground">View your history</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Push Notification Settings */}
        <div className="animate-slide-up stagger-6">
          <PushNotificationSettings />
        </div>
      </div>
    </MemberLayout>
  );
}
