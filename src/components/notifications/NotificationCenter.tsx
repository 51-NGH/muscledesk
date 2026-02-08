import { useState, useMemo } from "react";
import { Bell, AlertTriangle, Clock, CreditCard, CheckCircle2, ChevronRight, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useExpiringMembers, usePayments } from "@/hooks/useGymData";
import { format, differenceInDays, isToday, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "expiry" | "payment" | "reminder";
  title: string;
  message: string;
  time: Date;
  read: boolean;
  memberId?: string;
  memberName?: string;
  daysRemaining?: number;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: expiringMembers = [] } = useExpiringMembers(14);
  const { data: recentPayments = [] } = usePayments();

  const notifications = useMemo(() => {
    const notifs: Notification[] = [];

    expiringMembers.forEach((member: any) => {
      const daysRemaining = member.days_remaining;
      notifs.push({
        id: `expiry-${member.id}`,
        type: "expiry",
        title: daysRemaining <= 0 ? "Membership Expired" : "Membership Expiring",
        message: `${member.full_name}'s membership ${daysRemaining <= 0 ? "expired" : `expires in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`}`,
        time: new Date(member.expiry_date),
        read: false,
        memberId: member.id,
        memberName: member.full_name,
        daysRemaining,
      });
    });

    const recentOnes = recentPayments.filter(
      (p) => differenceInDays(new Date(), new Date(p.created_at)) <= 1
    );
    recentOnes.slice(0, 5).forEach((payment) => {
      notifs.push({
        id: `payment-${payment.id}`,
        type: "payment",
        title: "Payment Received",
        message: `₹${payment.amount.toLocaleString()} received from ${payment.member?.full_name || "Unknown"}`,
        time: new Date(payment.created_at),
        read: false,
        memberId: payment.member_id,
      });
    });

    notifs.sort((a, b) => {
      if (a.type === "expiry" && b.type !== "expiry") return -1;
      if (a.type !== "expiry" && b.type === "expiry") return 1;
      if (a.daysRemaining !== undefined && b.daysRemaining !== undefined) {
        return a.daysRemaining - b.daysRemaining;
      }
      return b.time.getTime() - a.time.getTime();
    });

    return notifs;
  }, [expiringMembers, recentPayments]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const expiryCount = notifications.filter((n) => n.type === "expiry").length;
  const expiredCount = notifications.filter((n) => n.type === "expiry" && n.daysRemaining !== undefined && n.daysRemaining <= 0).length;
  const paymentCount = notifications.filter((n) => n.type === "payment").length;

  const formatTimeAgo = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const getIcon = (type: string, daysRemaining?: number) => {
    switch (type) {
      case "expiry":
        return daysRemaining !== undefined && daysRemaining <= 0 ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        );
      case "payment":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getUrgencyLevel = (daysRemaining?: number) => {
    if (daysRemaining === undefined) return "normal";
    if (daysRemaining <= 0) return "expired";
    if (daysRemaining <= 3) return "critical";
    if (daysRemaining <= 7) return "warning";
    return "normal";
  };

  const getIconStyle = (type: string, daysRemaining?: number) => {
    if (type === "expiry") {
      const urgency = getUrgencyLevel(daysRemaining);
      if (urgency === "expired") return "bg-destructive/15 text-destructive shadow-sm shadow-destructive/10";
      if (urgency === "critical") return "bg-[hsl(var(--md-orange))]/15 text-[hsl(var(--md-orange))] shadow-sm shadow-[hsl(var(--md-orange))]/10";
      return "bg-[hsl(var(--md-yellow))]/15 text-[hsl(var(--md-yellow))]";
    }
    if (type === "payment") return "bg-[hsl(var(--md-green))]/15 text-[hsl(var(--md-green))]";
    return "bg-muted text-muted-foreground";
  };

  const getBadgeVariant = (daysRemaining?: number) => {
    if (daysRemaining === undefined) return null;
    if (daysRemaining <= 0) return { label: "Expired", className: "bg-destructive/15 text-destructive border-destructive/20" };
    if (daysRemaining <= 3) return { label: "Urgent", className: "bg-[hsl(var(--md-orange))]/15 text-[hsl(var(--md-orange))] border-[hsl(var(--md-orange))]/20" };
    if (daysRemaining <= 7) return { label: "Soon", className: "bg-[hsl(var(--md-yellow))]/15 text-[hsl(var(--md-yellow))] border-[hsl(var(--md-yellow))]/20" };
    return null;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.memberId) {
      navigate(`/members?search=${notification.memberName || ""}`);
      setOpen(false);
    }
  };

  // Group notifications
  const expiredNotifs = notifications.filter(n => n.type === "expiry" && n.daysRemaining !== undefined && n.daysRemaining <= 0);
  const expiringNotifs = notifications.filter(n => n.type === "expiry" && n.daysRemaining !== undefined && n.daysRemaining > 0);
  const paymentNotifs = notifications.filter(n => n.type === "payment");

  const renderNotification = (notification: Notification, index: number) => {
    const badge = notification.type === "expiry" ? getBadgeVariant(notification.daysRemaining) : null;
    const urgency = getUrgencyLevel(notification.daysRemaining);

    return (
      <div
        key={notification.id}
        onClick={() => handleNotificationClick(notification)}
        className={cn(
          "group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200",
          "hover:bg-accent/50 active:scale-[0.99]",
          urgency === "expired" && "bg-destructive/[0.03]",
          urgency === "critical" && "bg-[hsl(var(--md-orange))]/[0.03]",
        )}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
          "group-hover:scale-105",
          getIconStyle(notification.type, notification.daysRemaining)
        )}>
          {getIcon(notification.type, notification.daysRemaining)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              {notification.title}
            </p>
            {badge && (
              <span className={cn(
                "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                badge.className
              )}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {notification.message}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground/70">
            {formatTimeAgo(notification.time)}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>
    );
  };

  const renderSection = (title: string, icon: React.ReactNode, count: number, items: Notification[], colorClass: string) => {
    if (items.length === 0) return null;
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border/50">
          <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", colorClass)}>
            {icon}
            {title}
          </div>
          <span className={cn(
            "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md",
            colorClass,
            "bg-current/10"
          )}>
            <span className="text-current">{count}</span>
          </span>
        </div>
        <div className="divide-y divide-border/40">
          {items.map((n, i) => renderNotification(n, i))}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl hover:bg-accent transition-all duration-300 hover:scale-105"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-1 shadow-lg shadow-destructive/30 animate-scale-in">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] sm:w-[420px] p-0 border-l border-border/50 shadow-2xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <SheetTitle className="text-lg font-bold tracking-tight">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sparkles className="h-3 w-3" />
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Summary Stats */}
          {(expiredCount > 0 || expiryCount > 0 || paymentCount > 0) && (
            <div className="flex gap-2">
              {expiredCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/15">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  <span className="text-[11px] font-semibold text-destructive">{expiredCount} expired</span>
                </div>
              )}
              {(expiryCount - expiredCount) > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--md-orange))]/10 border border-[hsl(var(--md-orange))]/15">
                  <Clock className="h-3 w-3 text-[hsl(var(--md-orange))]" />
                  <span className="text-[11px] font-semibold text-[hsl(var(--md-orange))]">{expiryCount - expiredCount} expiring</span>
                </div>
              )}
              {paymentCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--md-green))]/10 border border-[hsl(var(--md-green))]/15">
                  <CreditCard className="h-3 w-3 text-[hsl(var(--md-green))]" />
                  <span className="text-[11px] font-semibold text-[hsl(var(--md-green))]">{paymentCount} payments</span>
                </div>
              )}
            </div>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-160px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="relative mb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-inner">
                  <CheckCircle2 className="h-8 w-8 text-primary/60" />
                </div>
                <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--md-green))] shadow-lg">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">No new notifications. Everything is running smoothly.</p>
            </div>
          ) : (
            <div>
              {renderSection(
                "Expired",
                <AlertTriangle className="h-3 w-3" />,
                expiredNotifs.length,
                expiredNotifs,
                "text-destructive"
              )}
              {renderSection(
                "Expiring Soon",
                <Clock className="h-3 w-3" />,
                expiringNotifs.length,
                expiringNotifs,
                "text-[hsl(var(--md-orange))]"
              )}
              {renderSection(
                "Payments",
                <CreditCard className="h-3 w-3" />,
                paymentNotifs.length,
                paymentNotifs,
                "text-[hsl(var(--md-green))]"
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer Action */}
        {expiryCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
            <Button
              variant="default"
              size="sm"
              className="w-full rounded-xl h-10 font-medium shadow-lg shadow-primary/20"
              onClick={() => {
                navigate("/members?filter=Expiring");
                setOpen(false);
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              View All Expiring Members
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
