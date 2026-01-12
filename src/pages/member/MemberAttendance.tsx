import { useQuery } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, isYesterday, isThisWeek } from "date-fns";
import { Clock, Calendar, CheckCircle, Loader2 } from "lucide-react";

interface AttendanceRecord {
  id: string;
  check_in_at: string;
  source: string;
}

export default function MemberAttendance() {
  const { member } = useMemberAuth();

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["member-attendance", member?.id],
    queryFn: async () => {
      if (!member) return [];
      
      const { data, error } = await supabase
        .from("attendance")
        .select("id, check_in_at, source")
        .eq("member_id", member.id)
        .order("check_in_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!member,
  });

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isThisWeek(date)) return format(date, "EEEE");
    return format(date, "MMM d, yyyy");
  };

  const groupedAttendance = attendance?.reduce((groups, record) => {
    const dateLabel = formatDateLabel(record.check_in_at);
    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(record);
    return groups;
  }, {} as Record<string, AttendanceRecord[]>);

  return (
    <MemberLayout title="Attendance">
      <div className="space-y-5 animate-fade-in">
        {/* Stats Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/70 text-sm">Total Visits</p>
              <p className="text-3xl sm:text-4xl font-bold mt-1">{member?.total_visits || 0}</p>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
          </div>
          {member?.last_visit_at && (
            <p className="text-primary-foreground/70 text-xs sm:text-sm mt-3">
              Last visit: {format(parseISO(member.last_visit_at), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>

        {/* Attendance History */}
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Recent Check-ins
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !attendance || attendance.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-6 sm:p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm sm:text-base">No check-ins yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Your attendance history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAttendance || {}).map(([dateLabel, records], groupIndex) => (
                <div key={dateLabel} className="animate-slide-up" style={{ animationDelay: `${groupIndex * 50}ms` }}>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 px-1">{dateLabel}</p>
                  <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
                    {records.map((record) => (
                      <div key={record.id} className="p-3 sm:p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[hsl(var(--md-green))]/10 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(var(--md-green))]" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Check-in</p>
                            <p className="text-[11px] sm:text-xs text-muted-foreground capitalize">
                              Via {record.source === "qr" ? "QR Scan" : record.source}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs sm:text-sm">
                            {format(parseISO(record.check_in_at), "h:mm a")}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">
                            {format(parseISO(record.check_in_at), "MMM d")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MemberLayout>
  );
}
