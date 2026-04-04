import { useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UpgradeRequiredPage } from "@/components/UpgradeOverlay";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Send, Clock, UserX, CalendarClock, CheckCircle2 } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ReminderCategory = "expiring_soon" | "recently_expired" | "inactive";

interface ReminderMember {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  expiry_date: string;
  plan_name: string | null;
  member_id: string;
  status: string;
  last_visit_at: string | null;
}

// Fetch all members for reminders - 3 categories
function useReminderMembers() {
  const { gymId } = useAuth();

  return useQuery({
    queryKey: ["reminder-members", gymId],
    queryFn: async () => {
      if (!gymId) return { expiringSoon: [], recentlyExpired: [], inactive: [] };

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Expiring in next 14 days (including today)
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 14);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      // Expired in last 30 days
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 30);
      const past30Str = past30.toISOString().split("T")[0];

      // Expired more than 30 days ago (inactive/lapsed)
      const past90 = new Date(today);
      past90.setDate(past90.getDate() - 90);
      const past90Str = past90.toISOString().split("T")[0];

      // Fetch all 3 in parallel
      const [expiringSoonRes, recentlyExpiredRes, inactiveRes] = await Promise.all([
        // 1. Expiring soon: expiry between today and +14 days
        supabase
          .from("members")
          .select("id, full_name, phone, email, expiry_date, plan_name, member_id, status, last_visit_at")
          .eq("gym_id", gymId)
          .is("deleted_at", null)
          .gte("expiry_date", todayStr)
          .lte("expiry_date", futureDateStr)
          .order("expiry_date", { ascending: true }),
        // 2. Recently expired: expiry between -30 days and yesterday
        supabase
          .from("members")
          .select("id, full_name, phone, email, expiry_date, plan_name, member_id, status, last_visit_at")
          .eq("gym_id", gymId)
          .is("deleted_at", null)
          .gte("expiry_date", past30Str)
          .lt("expiry_date", todayStr)
          .order("expiry_date", { ascending: false }),
        // 3. Inactive/lapsed: expiry between -90 and -30 days
        supabase
          .from("members")
          .select("id, full_name, phone, email, expiry_date, plan_name, member_id, status, last_visit_at")
          .eq("gym_id", gymId)
          .is("deleted_at", null)
          .gte("expiry_date", past90Str)
          .lt("expiry_date", past30Str)
          .order("expiry_date", { ascending: false }),
      ]);

      return {
        expiringSoon: (expiringSoonRes.data || []) as ReminderMember[],
        recentlyExpired: (recentlyExpiredRes.data || []) as ReminderMember[],
        inactive: (inactiveRes.data || []) as ReminderMember[],
      };
    },
    enabled: !!gymId,
  });
}

function normalizeIndianPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s+\-()]/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    const local = cleaned.substring(2);
    if (/^[6-9]\d{9}$/.test(local)) return cleaned;
    return null;
  }
  if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
    return '91' + cleaned;
  }
  return null;
}

function getWhatsAppMessage(category: ReminderCategory, memberName: string, gymName: string, days: number): string {
  const firstName = memberName.split(' ')[0];
  switch (category) {
    case 'expiring_soon':
      return days === 0
        ? `Hi ${firstName}, your ${gymName} membership expires today! Renew now to avoid interruption. Visit your gym or call us.`
        : `Hi ${firstName}, your ${gymName} membership expires in ${days} days. Renew now to continue your fitness journey!`;
    case 'recently_expired':
      return `Hi ${firstName}, your ${gymName} membership expired ${Math.abs(days)} days ago. Renew today and get back on track!`;
    case 'inactive':
      return `Hi ${firstName}, we miss you at ${gymName}! Your membership has lapsed. Come back with a special renewal offer - contact us today!`;
  }
}

export default function Reminders() {
  const { data: features, isLoading } = useGymPlanFeatures();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!features?.hasRemindersPage) {
    return (
      <DashboardLayout>
        <UpgradeRequiredPage
          feature="Renewal Reminders"
          description="Send SMS reminders to members with expiring memberships. Never miss a renewal opportunity again."
        />
      </DashboardLayout>
    );
  }

  return <RemindersContent />;
}

function RemindersContent() {
  const { data, isLoading } = useReminderMembers();
  const { gymId } = useAuth();
  const { data: gymInfo } = useQuery({
    queryKey: ["gym-name", gymId],
    queryFn: async () => {
      if (!gymId) return null;
      const { data } = await supabase.from("gyms").select("name").eq("id", gymId).single();
      return data;
    },
    enabled: !!gymId,
  });
  const [activeTab, setActiveTab] = useState<ReminderCategory>("expiring_soon");
  const [selectedMembers, setSelectedMembers] = useState<Record<ReminderCategory, string[]>>({
    expiring_soon: [],
    recently_expired: [],
    inactive: [],
  });
  const [isSending, setIsSending] = useState(false);

  const members = useMemo(() => {
    if (!data) return [];
    switch (activeTab) {
      case "expiring_soon": return data.expiringSoon;
      case "recently_expired": return data.recentlyExpired;
      case "inactive": return data.inactive;
    }
  }, [data, activeTab]);

  const selected = selectedMembers[activeTab];

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].includes(id)
        ? prev[activeTab].filter((x) => x !== id)
        : [...prev[activeTab], id],
    }));
  };

  const selectAll = () => {
    const allIds = members.map((m) => m.id);
    setSelectedMembers((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].length === allIds.length ? [] : allIds,
    }));
  };

  const handleSendWhatsApp = useCallback(() => {
    if (selected.length === 0) return;
    const gymName = gymData?.name || 'your gym';
    const selectedMembersList = members.filter((m) => selected.includes(m.id));
    
    let sent = 0;
    let skipped = 0;

    setIsSending(true);

    for (const member of selectedMembersList) {
      const phone = normalizeIndianPhone(member.phone || '');
      if (!phone) {
        skipped++;
        continue;
      }
      const days = differenceInDays(parseISO(member.expiry_date), new Date());
      const message = getWhatsAppMessage(activeTab, member.full_name, gymName, days);
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      sent++;
    }

    setIsSending(false);

    if (sent > 0) {
      toast.success(`Opened WhatsApp for ${sent} member${sent > 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped - invalid phone)` : ''}`);
    } else {
      toast.warning(`No valid phone numbers found (${skipped} skipped)`);
    }
  }, [selected, members, activeTab, gymData]);

  const getDaysText = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days === 0) return "Today";
    if (days > 0) return `in ${days}d`;
    return `${Math.abs(days)}d ago`;
  };

  const getCategoryConfig = (cat: ReminderCategory) => {
    switch (cat) {
      case "expiring_soon":
        return {
          icon: CalendarClock,
          label: "Expiring Soon",
          badge: data?.expiringSoon.length || 0,
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-100 dark:bg-orange-900/30",
          description: "Members whose membership expires within 14 days",
          emptyText: "No members expiring soon — all memberships are active!",
          smsLabel: "Send Renewal Reminder",
        };
      case "recently_expired":
        return {
          icon: Clock,
          label: "Recently Expired",
          badge: data?.recentlyExpired.length || 0,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          description: "Members whose membership expired in the last 30 days",
          emptyText: "No recently expired memberships — great retention!",
          smsLabel: "Send Re-activation SMS",
        };
      case "inactive":
        return {
          icon: UserX,
          label: "Inactive / Lapsed",
          badge: data?.inactive.length || 0,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          description: "Members who expired 30-90 days ago",
          emptyText: "No lapsed members in this period.",
          smsLabel: "Send Win-back SMS",
        };
    }
  };

  const config = getCategoryConfig(activeTab);
  const Icon = config.icon;

  return (
    <DashboardLayout>
      <PageHeader
        title="Renewal Reminders"
        description="One-click SMS reminders for 3 member categories"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(["expiring_soon", "recently_expired", "inactive"] as ReminderCategory[]).map((cat) => {
          const c = getCategoryConfig(cat);
          const CatIcon = c.icon;
          return (
            <Card
              key={cat}
              className={cn(
                "cursor-pointer transition-all border-2",
                activeTab === cat ? "border-primary shadow-md" : "border-transparent hover:border-border"
              )}
              onClick={() => setActiveTab(cat)}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", c.bgColor)}>
                      <CatIcon className={cn("h-5 w-5", c.color)} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.description.split(" ").slice(0, 4).join(" ")}...</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold px-3">
                    {c.badge}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon className={cn("h-5 w-5", config.color)} />
                {config.label}
                <Badge variant="outline" className="ml-1">{members.length}</Badge>
              </CardTitle>
              {members.length > 0 && (
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selected.length === members.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                <p className="font-medium">{config.emptyText}</p>
              </div>
            ) : (
              <ScrollArea className="h-[450px] pr-2">
                <div className="space-y-2">
                  {members.map((member) => {
                    const days = differenceInDays(parseISO(member.expiry_date), new Date());
                    const isExpired = days < 0;
                    const isSelected = selected.includes(member.id);

                    return (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        )}
                        onClick={() => toggleMember(member.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleMember(member.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground truncate">
                                {member.full_name}
                              </p>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {member.member_id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{member.phone}</span>
                              {member.plan_name && (
                                <>
                                  <span>•</span>
                                  <span>{member.plan_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-medium text-xs",
                                isExpired
                                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                                  : days <= 3
                                    ? "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                    : "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400"
                              )}
                            >
                              {getDaysText(member.expiry_date)}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(parseISO(member.expiry_date), "dd MMM yyyy")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Action Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  SMS Preview ({config.label})
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {activeTab === "expiring_soon" && (
                    <>Hi <span className="font-semibold">Member</span>, your <span className="font-semibold">Gym</span> membership expires in <span className="font-semibold">X days</span>. Renew now to continue your fitness journey!</>
                  )}
                  {activeTab === "recently_expired" && (
                    <>Hi <span className="font-semibold">Member</span>, your <span className="font-semibold">Gym</span> membership expired <span className="font-semibold">X days</span> ago. Renew today and get back on track!</>
                  )}
                  {activeTab === "inactive" && (
                    <>Hi <span className="font-semibold">Member</span>, we miss you at <span className="font-semibold">Gym</span>! Your membership has lapsed. Come back with a special renewal offer!</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-foreground">
                  <strong>{selected.length}</strong> member{selected.length !== 1 ? "s" : ""} selected
                </p>
              </div>
            </div>

            <Button
              onClick={handleSendSms}
              disabled={selected.length === 0 || sendSms.isPending}
              className="w-full gap-2"
              size="lg"
            >
              <Send className="h-5 w-5" />
              {sendSms.isPending
                ? `Sending to ${selected.length}...`
                : `${config.smsLabel} (${selected.length})`}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              SMS sent via MSG91 • Logged in message history
            </p>

            {/* Quick Stats */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Summary
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {data?.expiringSoon.length || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Expiring</p>
                </div>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <p className="text-lg font-bold text-destructive">
                    {data?.recentlyExpired.length || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Expired</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <p className="text-lg font-bold text-muted-foreground">
                    {data?.inactive.length || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Lapsed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
