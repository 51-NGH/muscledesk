import { useFingerprintAttendance } from "@/hooks/useFingerprintDevices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Fingerprint, Clock, User } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export function RecentFingerprintAttendance() {
  const { data: attendance, isLoading } = useFingerprintAttendance(15);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Fingerprint className="h-4 w-4" />
            Recent Fingerprint Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-primary" />
          Recent Fingerprint Check-ins
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {attendance && attendance.length > 0 ? (
            <div className="divide-y divide-border">
              {attendance.map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                  <div className="member-avatar h-10 w-10 text-sm">
                    {record.member?.full_name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {record.member?.full_name || "Unknown Member"}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {record.member?.member_id}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(record.check_in_at), "h:mm a")}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(record.check_in_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={record.member?.status === 'active' ? 'default' : 'secondary'}
                    className="shrink-0"
                  >
                    {record.member?.status || 'unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Fingerprint className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No fingerprint check-ins yet today
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
