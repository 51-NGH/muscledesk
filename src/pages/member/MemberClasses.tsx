import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { invokeMemberPortal, invokeMemberAuth } from "@/lib/memberPortalClient";
import { format, parseISO } from "date-fns";
import { 
  Calendar, Loader2, Users, Clock, MapPin, 
  Check, X, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mapDatabaseError } from "@/lib/errorMapper";
interface ClassSchedule {
  id: string;
  scheduled_at: string;
  is_cancelled: boolean;
  notes: string | null;
  class: {
    id: string;
    name: string;
    description: string | null;
    instructor_name: string | null;
    capacity: number;
    duration_minutes: number;
  };
  my_booking: {
    id: string;
    status: string;
  } | null;
  spots_taken: number;
}

export default function MemberClasses() {
  const { member, loading, memberLoading } = useMemberAuth();
  const queryClient = useQueryClient();

  const { data: classes, isLoading } = useQuery({
    queryKey: ["member-classes", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await invokeMemberPortal( {
        body: { action: "get-classes", member_id: member.id }
      });
      if (error) throw error;
      return (data?.classes || []) as ClassSchedule[];
    },
    enabled: !!member,
  });

  const bookMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      if (!member) throw new Error("Not logged in");
      const { data, error } = await invokeMemberPortal( {
        body: {
          action: "book-class",
          member_id: member.id,
          data: { schedule_id: scheduleId }
        }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Booking failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-classes"] });
      toast.success("Class booked! 🎉");
    },
    onError: (error) => {
      toast.error(mapDatabaseError(error));
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      if (!member) throw new Error("Not logged in");
      const { data, error } = await invokeMemberPortal( {
        body: {
          action: "cancel-booking",
          member_id: member.id,
          data: { booking_id: bookingId }
        }
      });
      if (error || !data?.success) throw new Error("Cancellation failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-classes"] });
      toast.success("Booking cancelled");
    }
  });

  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Classes">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  const bookedCount = classes?.filter(c => c.my_booking?.status === "booked").length || 0;

  return (
    <MemberLayout title="Classes">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-[hsl(var(--md-purple))] to-[hsl(var(--md-purple))]/80 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Upcoming</p>
              <p className="text-2xl font-bold mt-1">Gym Classes</p>
              <p className="text-white/70 text-xs mt-2">
                {bookedCount} classes booked
              </p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center">
              <Calendar className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Classes List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !classes || classes.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No upcoming classes</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for scheduled classes
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {classes.map((schedule, idx) => {
              const isFull = schedule.spots_taken >= schedule.class.capacity;
              const isBooked = schedule.my_booking?.status === "booked";
              const spotsLeft = schedule.class.capacity - schedule.spots_taken;

              return (
                <Card 
                  key={schedule.id} 
                  className={cn(
                    "p-4 animate-slide-up",
                    isBooked && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-12 w-12 rounded-lg flex flex-col items-center justify-center shrink-0",
                      isBooked ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <span className="text-xs font-medium">
                        {format(parseISO(schedule.scheduled_at), "MMM")}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {format(parseISO(schedule.scheduled_at), "d")}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{schedule.class.name}</h3>
                        {isBooked && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full shrink-0">
                            Booked
                          </span>
                        )}
                      </div>
                      
                      {schedule.class.instructor_name && (
                        <p className="text-xs text-muted-foreground">
                          with {schedule.class.instructor_name}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(schedule.scheduled_at), "h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {schedule.class.duration_minutes} min
                        </span>
                        <span className={cn(
                          "flex items-center gap-1",
                          isFull && !isBooked && "text-destructive"
                        )}>
                          <Users className="h-3 w-3" />
                          {spotsLeft} spots left
                        </span>
                      </div>

                      {schedule.class.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {schedule.class.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border">
                    {isBooked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => cancelMutation.mutate(schedule.my_booking!.id)}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Cancel Booking
                          </>
                        )}
                      </Button>
                    ) : isFull ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Class Full
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => bookMutation.mutate(schedule.id)}
                        disabled={bookMutation.isPending}
                      >
                        {bookMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Book Class
                          </>
                        )}
                      </Button>
                    )}
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
