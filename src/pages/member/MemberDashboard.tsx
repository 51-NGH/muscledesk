import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { format, differenceInDays, parseISO } from "date-fns";
import { 
  User, 
  CreditCard, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Target,
  Flame,
  Award
} from "lucide-react";

export default function MemberDashboard() {
  const { member } = useMemberAuth();

  if (!member) return null;

  const expiryDate = parseISO(member.expiry_date);
  const daysRemaining = differenceInDays(expiryDate, new Date());
  const isExpired = daysRemaining < 0;

  // Calculate streak (simplified - just using total visits)
  const currentStreak = Math.min(member.total_visits, 30);
  const streakLevel = currentStreak >= 20 ? "🔥 On Fire!" : currentStreak >= 10 ? "⚡ Great!" : currentStreak >= 5 ? "💪 Nice!" : "🌱 Getting Started";

  return (
    <MemberLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-primary-foreground/70 text-sm">Welcome back,</p>
              <h1 className="text-2xl font-bold mt-1">{member.full_name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-primary-foreground/80">ID: {member.member_id}</span>
              </div>
            </div>
            <div className="h-14 w-14 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <User className="h-7 w-7" />
              )}
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Membership Status */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
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
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <CreditCard className="h-4 w-4" />
              <span>Plan</span>
            </div>
            <p className="font-semibold">{member.plan_name || "Standard"}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Since {format(parseISO(member.start_date), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Membership Dates */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Membership Period
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium">{format(parseISO(member.start_date), "MMM d, yyyy")}</p>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Expiry Date</p>
              <p className={`font-medium ${isExpired ? "text-destructive" : ""}`}>
                {format(expiryDate, "MMM d, yyyy")}
              </p>
            </div>
          </div>
          {!isExpired && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{Math.max(0, Math.round((1 - daysRemaining / 30) * 100))}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (1 - daysRemaining / 30) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Visits */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
              <TrendingUp className="h-4 w-4" />
              <span>Total Visits</span>
            </div>
            <p className="text-3xl font-bold">{member.total_visits}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {member.last_visit_at 
                ? `Last: ${format(parseISO(member.last_visit_at), "MMM d")}`
                : "No visits yet"}
            </p>
          </div>

          {/* Streak */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
              <Flame className="h-4 w-4" />
              <span>Streak</span>
            </div>
            <p className="text-3xl font-bold">{currentStreak}</p>
            <p className="text-xs text-muted-foreground mt-1">{streakLevel}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => window.location.href = "/member/qr"}
            className="bg-card rounded-xl border border-border p-4 text-left hover:border-primary/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <p className="font-medium">QR Code</p>
            <p className="text-xs text-muted-foreground">For check-in</p>
          </button>

          <button 
            onClick={() => window.location.href = "/member/attendance"}
            className="bg-card rounded-xl border border-border p-4 text-left hover:border-primary/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <p className="font-medium">Attendance</p>
            <p className="text-xs text-muted-foreground">View history</p>
          </button>
        </div>
      </div>
    </MemberLayout>
  );
}
