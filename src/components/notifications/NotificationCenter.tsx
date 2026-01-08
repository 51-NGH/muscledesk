import { useState, useMemo } from "react";
import { Bell, X, AlertTriangle, Clock, CreditCard, CheckCircle2 } from "lucide-react";
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

  // Generate notifications from data
  const notifications = useMemo(() => {
    const notifs: Notification[] = [];

    // Expiring membership alerts
    expiringMembers.forEach((member: any) => {
      const daysRemaining = member.days_remaining;
      let urgency = "";
      
      if (daysRemaining <= 0) {
        urgency = "Expired";
      } else if (daysRemaining <= 3) {
        urgency = "Urgent";
      } else if (daysRemaining <= 7) {
        urgency = "Soon";
      }

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

    // Recent payment confirmations (last 24 hours)
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

    // Sort by urgency (expiring first, then by time)
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

  const formatTimeAgo = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const getIcon = (type: string, daysRemaining?: number) => {
    switch (type) {
      case "expiry":
        return daysRemaining !== undefined && daysRemaining <= 3 ? (
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

  const getIconStyle = (type: string, daysRemaining?: number) => {
    if (type === "expiry") {
      if (daysRemaining !== undefined && daysRemaining <= 0) {
        return "bg-destructive/10 text-destructive";
      }
      if (daysRemaining !== undefined && daysRemaining <= 3) {
        return "bg-[hsl(var(--md-orange))]/10 text-[hsl(var(--md-orange))]";
      }
      return "bg-[hsl(var(--md-yellow))]/10 text-[hsl(var(--md-yellow))]";
    }
    if (type === "payment") {
      return "bg-[hsl(var(--md-green))]/10 text-[hsl(var(--md-green))]";
    }
    return "bg-muted text-muted-foreground";
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.memberId) {
      navigate(`/members?search=${notification.memberName || ""}`);
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-muted transition-all duration-300 hover:scale-110"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground animate-pulse-subtle">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px] p-0">
        <SheetHeader className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Notifications</SheetTitle>
            {expiryCount > 0 && (
              <Badge variant="destructive" className="animate-pulse-subtle">
                {expiryCount} expiring
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex items-start gap-3 p-4 cursor-pointer transition-all duration-200 hover:bg-muted/50 animate-fade-in",
                    notification.type === "expiry" && notification.daysRemaining !== undefined && notification.daysRemaining <= 3 && "bg-destructive/5"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform hover:scale-110",
                    getIconStyle(notification.type, notification.daysRemaining)
                  )}>
                    {getIcon(notification.type, notification.daysRemaining)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {notification.title}
                      </p>
                      {notification.type === "expiry" && notification.daysRemaining !== undefined && notification.daysRemaining <= 3 && (
                        <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0.5">
                          {notification.daysRemaining <= 0 ? "Expired" : "Urgent"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatTimeAgo(notification.time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Action */}
          {expiryCount > 0 && (
            <div className="p-4 border-t border-border bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  navigate("/members?filter=Expiring");
                  setOpen(false);
                }}
              >
                View All Expiring Members
              </Button>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
