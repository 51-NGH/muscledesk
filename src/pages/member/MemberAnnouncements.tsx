import { useQuery } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { invokeMemberPortal, invokeMemberAuth } from "@/lib/memberPortalClient";
import { format, parseISO } from "date-fns";
import { Megaphone, Loader2, AlertTriangle, Info, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "urgent";
  publish_at: string;
  expires_at: string | null;
  created_at: string;
}

const priorityConfig = {
  low: { 
    color: "text-muted-foreground", 
    bg: "bg-muted", 
    icon: Info,
    label: "Info"
  },
  normal: { 
    color: "text-primary", 
    bg: "bg-primary/10", 
    icon: Bell,
    label: "Update"
  },
  high: { 
    color: "text-[hsl(var(--md-orange))]", 
    bg: "bg-[hsl(var(--md-orange))]/10", 
    icon: AlertTriangle,
    label: "Important"
  },
  urgent: { 
    color: "text-destructive", 
    bg: "bg-destructive/10", 
    icon: Megaphone,
    label: "Urgent"
  }
};

export default function MemberAnnouncements() {
  const { member, loading, memberLoading } = useMemberAuth();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["member-announcements", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await invokeMemberPortal( {
        body: { action: "get-announcements", member_id: member.id }
      });
      if (error) throw error;
      return (data?.announcements || []) as Announcement[];
    },
    enabled: !!member,
  });

  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Announcements">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout title="Announcements">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/70 text-sm">Gym Updates</p>
              <p className="text-2xl font-bold mt-1">Announcements</p>
              <p className="text-primary-foreground/70 text-xs mt-2">
                {announcements?.length || 0} active announcements
              </p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <Megaphone className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Announcements List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !announcements || announcements.length === 0 ? (
          <Card className="p-8 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No announcements</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your gym hasn't posted any updates yet
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement, idx) => {
              const config = priorityConfig[announcement.priority];
              const Icon = config.icon;
              
              return (
                <Card 
                  key={announcement.id} 
                  className={cn(
                    "p-4 animate-slide-up border-l-4",
                    announcement.priority === "urgent" && "border-l-destructive",
                    announcement.priority === "high" && "border-l-[hsl(var(--md-orange))]",
                    announcement.priority === "normal" && "border-l-primary",
                    announcement.priority === "low" && "border-l-muted"
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(announcement.publish_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm">{announcement.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
