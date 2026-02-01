import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { Target, Loader2, Trophy, Flame, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GoalProgress {
  weekly_visits: number;
  monthly_visits: number;
  goals: Array<{
    id: string;
    goal_type: "weekly" | "monthly";
    target_visits: number;
    is_active: boolean;
  }>;
}

export default function MemberGoals() {
  const { member, loading, memberLoading } = useMemberAuth();
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState<{ type: "weekly" | "monthly"; target: number } | null>(null);

  const { data: progress, isLoading } = useQuery({
    queryKey: ["member-goals", member?.id],
    queryFn: async () => {
      if (!member) return null;
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: { action: "get-goal-progress", member_id: member.id }
      });
      if (error) throw error;
      return data as GoalProgress;
    },
    enabled: !!member,
  });

  const setGoalMutation = useMutation({
    mutationFn: async ({ goal_type, target_visits }: { goal_type: "weekly" | "monthly"; target_visits: number }) => {
      if (!member) throw new Error("Not logged in");
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: {
          action: "set-goal",
          member_id: member.id,
          data: { goal_type, target_visits }
        }
      });
      if (error || !data?.success) throw new Error("Failed to set goal");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-goals"] });
      setSelectedGoal(null);
      toast.success("Goal set! 🎯");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Goals">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  const weeklyGoal = progress?.goals.find(g => g.goal_type === "weekly");
  const monthlyGoal = progress?.goals.find(g => g.goal_type === "monthly");
  
  const weeklyProgress = weeklyGoal 
    ? Math.min(100, (progress?.weekly_visits || 0) / weeklyGoal.target_visits * 100)
    : 0;
  const monthlyProgress = monthlyGoal
    ? Math.min(100, (progress?.monthly_visits || 0) / monthlyGoal.target_visits * 100)
    : 0;

  const weeklyCompleted = weeklyGoal && (progress?.weekly_visits || 0) >= weeklyGoal.target_visits;
  const monthlyCompleted = monthlyGoal && (progress?.monthly_visits || 0) >= monthlyGoal.target_visits;

  return (
    <MemberLayout title="Goals">
      <div className="space-y-5 animate-fade-in">
        {/* Stats Header */}
        <div className="bg-gradient-to-br from-[hsl(var(--md-green))] to-[hsl(var(--md-green))]/80 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Your Progress</p>
              <p className="text-2xl font-bold mt-1">Attendance Goals</p>
              <p className="text-white/70 text-xs mt-2">
                Stay consistent, achieve more!
              </p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center">
              <Target className="h-7 w-7" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Weekly Goal */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    weeklyCompleted ? "bg-[hsl(var(--md-green))]/10" : "bg-primary/10"
                  )}>
                    {weeklyCompleted ? (
                      <Trophy className="h-5 w-5 text-[hsl(var(--md-green))]" />
                    ) : (
                      <Calendar className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">Weekly Goal</p>
                    <p className="text-xs text-muted-foreground">This week's target</p>
                  </div>
                </div>
                {weeklyCompleted && (
                  <span className="px-2 py-1 bg-[hsl(var(--md-green))]/10 text-[hsl(var(--md-green))] text-xs font-medium rounded-full">
                    Completed! 🎉
                  </span>
                )}
              </div>

              {weeklyGoal ? (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{progress?.weekly_visits || 0} / {weeklyGoal.target_visits} visits</span>
                    <span className="text-muted-foreground">{Math.round(weeklyProgress)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        weeklyCompleted ? "bg-[hsl(var(--md-green))]" : "bg-primary"
                      )}
                      style={{ width: `${weeklyProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[3, 4, 5, 6].map(n => (
                    <Button
                      key={n}
                      variant={selectedGoal?.type === "weekly" && selectedGoal.target === n ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedGoal({ type: "weekly", target: n })}
                    >
                      {n}x per week
                    </Button>
                  ))}
                </div>
              )}

              {selectedGoal?.type === "weekly" && (
                <Button 
                  className="w-full mt-3"
                  onClick={() => setGoalMutation.mutate({ goal_type: "weekly", target_visits: selectedGoal.target })}
                  disabled={setGoalMutation.isPending}
                >
                  {setGoalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Set Weekly Goal
                    </>
                  )}
                </Button>
              )}
            </Card>

            {/* Monthly Goal */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    monthlyCompleted ? "bg-[hsl(var(--md-green))]/10" : "bg-[hsl(var(--md-orange))]/10"
                  )}>
                    {monthlyCompleted ? (
                      <Trophy className="h-5 w-5 text-[hsl(var(--md-green))]" />
                    ) : (
                      <Flame className="h-5 w-5 text-[hsl(var(--md-orange))]" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">Monthly Goal</p>
                    <p className="text-xs text-muted-foreground">This month's target</p>
                  </div>
                </div>
                {monthlyCompleted && (
                  <span className="px-2 py-1 bg-[hsl(var(--md-green))]/10 text-[hsl(var(--md-green))] text-xs font-medium rounded-full">
                    Completed! 🎉
                  </span>
                )}
              </div>

              {monthlyGoal ? (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{progress?.monthly_visits || 0} / {monthlyGoal.target_visits} visits</span>
                    <span className="text-muted-foreground">{Math.round(monthlyProgress)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        monthlyCompleted ? "bg-[hsl(var(--md-green))]" : "bg-[hsl(var(--md-orange))]"
                      )}
                      style={{ width: `${monthlyProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[12, 16, 20, 24].map(n => (
                    <Button
                      key={n}
                      variant={selectedGoal?.type === "monthly" && selectedGoal.target === n ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedGoal({ type: "monthly", target: n })}
                    >
                      {n}x per month
                    </Button>
                  ))}
                </div>
              )}

              {selectedGoal?.type === "monthly" && (
                <Button 
                  className="w-full mt-3"
                  onClick={() => setGoalMutation.mutate({ goal_type: "monthly", target_visits: selectedGoal.target })}
                  disabled={setGoalMutation.isPending}
                >
                  {setGoalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Set Monthly Goal
                    </>
                  )}
                </Button>
              )}
            </Card>

            {/* Stats Summary */}
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-3 text-sm">This Period</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{progress?.weekly_visits || 0}</p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progress?.monthly_visits || 0}</p>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </MemberLayout>
  );
}
