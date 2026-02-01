import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { 
  Dumbbell, Plus, Trash2, Loader2, Calendar, Clock, 
  ChevronDown, ChevronUp, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mapDatabaseError } from "@/lib/errorMapper";

interface Exercise {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  notes: string | null;
}

interface WorkoutSession {
  id: string;
  name: string;
  session_date: string;
  notes: string | null;
  duration_minutes: number | null;
  exercises: Exercise[];
  created_at: string;
}

const COMMON_EXERCISES = [
  "Bench Press", "Squats", "Deadlift", "Pull-ups", "Push-ups",
  "Shoulder Press", "Bicep Curls", "Tricep Dips", "Lat Pulldown",
  "Leg Press", "Lunges", "Plank", "Crunches", "Running", "Cycling"
];

export default function MemberWorkouts() {
  const { member, loading, memberLoading } = useMemberAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [newWorkout, setNewWorkout] = useState({
    name: "",
    duration_minutes: "",
    notes: "",
    exercises: [{ exercise_name: "", sets: 3, reps: 10, weight_kg: "" }]
  });

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["member-workouts", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: { action: "get-workouts", member_id: member.id }
      });
      if (error) throw error;
      return (data?.workouts || []) as WorkoutSession[];
    },
    enabled: !!member,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not logged in");
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: {
          action: "create-workout",
          member_id: member.id,
          data: {
            name: newWorkout.name || "Workout",
            duration_minutes: newWorkout.duration_minutes ? parseInt(newWorkout.duration_minutes) : null,
            notes: newWorkout.notes || null,
            exercises: newWorkout.exercises.filter(e => e.exercise_name).map(e => ({
              ...e,
              weight_kg: e.weight_kg ? parseFloat(e.weight_kg as string) : null
            }))
          }
        }
      });
      if (error || !data?.success) throw new Error(data?.error || "Failed to create workout");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-workouts"] });
      setShowAddForm(false);
      setNewWorkout({
        name: "",
        duration_minutes: "",
        notes: "",
        exercises: [{ exercise_name: "", sets: 3, reps: 10, weight_kg: "" }]
      });
      toast.success("Workout logged! 💪");
    },
    onError: (error) => {
      toast.error(mapDatabaseError(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!member) throw new Error("Not logged in");
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: {
          action: "delete-workout",
          member_id: member.id,
          data: { session_id: sessionId }
        }
      });
      if (error || !data?.success) throw new Error("Failed to delete workout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-workouts"] });
      toast.success("Workout deleted");
    }
  });

  const addExercise = () => {
    setNewWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, { exercise_name: "", sets: 3, reps: 10, weight_kg: "" }]
    }));
  };

  const updateExercise = (index: number, field: string, value: string | number) => {
    setNewWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === index ? { ...ex, [field]: value } : ex)
    }));
  };

  const removeExercise = (index: number) => {
    setNewWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Workouts">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  const totalWorkouts = workouts?.length || 0;
  const thisMonthWorkouts = workouts?.filter(w => 
    new Date(w.session_date).getMonth() === new Date().getMonth()
  ).length || 0;

  return (
    <MemberLayout title="Workouts">
      <div className="space-y-5 animate-fade-in">
        {/* Stats Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/70 text-sm">Total Workouts</p>
              <p className="text-3xl sm:text-4xl font-bold mt-1">{totalWorkouts}</p>
              <p className="text-primary-foreground/70 text-xs mt-2">
                {thisMonthWorkouts} this month
              </p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <Dumbbell className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Add Workout Button */}
        {!showAddForm && (
          <Button 
            className="w-full h-12 rounded-xl"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Log Workout
          </Button>
        )}

        {/* Add Workout Form */}
        {showAddForm && (
          <Card className="p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Log New Workout</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Workout name"
                  value={newWorkout.name}
                  onChange={(e) => setNewWorkout(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Duration (min)"
                  value={newWorkout.duration_minutes}
                  onChange={(e) => setNewWorkout(prev => ({ ...prev, duration_minutes: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Exercises</p>
                  <Button variant="outline" size="sm" onClick={addExercise}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>

                {newWorkout.exercises.map((ex, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm"
                      value={ex.exercise_name}
                      onChange={(e) => updateExercise(idx, "exercise_name", e.target.value)}
                    >
                      <option value="">Select exercise</option>
                      {COMMON_EXERCISES.map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                    <Input
                      className="w-16"
                      type="number"
                      placeholder="Sets"
                      value={ex.sets}
                      onChange={(e) => updateExercise(idx, "sets", parseInt(e.target.value) || 1)}
                    />
                    <Input
                      className="w-16"
                      type="number"
                      placeholder="Reps"
                      value={ex.reps}
                      onChange={(e) => updateExercise(idx, "reps", parseInt(e.target.value) || 0)}
                    />
                    <Input
                      className="w-20"
                      type="number"
                      placeholder="kg"
                      value={ex.weight_kg}
                      onChange={(e) => updateExercise(idx, "weight_kg", e.target.value)}
                    />
                    {newWorkout.exercises.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0"
                        onClick={() => removeExercise(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button 
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newWorkout.exercises.some(e => e.exercise_name)}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Workout
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Workout History */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            Workout History
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !workouts || workouts.length === 0 ? (
            <Card className="p-8 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No workouts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start logging your gym sessions!
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {workouts.map((workout, idx) => (
                <Card 
                  key={workout.id} 
                  className="overflow-hidden animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <button
                    className="w-full p-4 text-left flex items-center justify-between"
                    onClick={() => setExpandedSession(
                      expandedSession === workout.id ? null : workout.id
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{workout.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(parseISO(workout.session_date), "MMM d, yyyy")}</span>
                          {workout.duration_minutes && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {workout.duration_minutes} min
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {workout.exercises?.length || 0} exercises
                      </span>
                      {expandedSession === workout.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {expandedSession === workout.id && (
                    <div className="px-4 pb-4 border-t border-border pt-3 animate-fade-in">
                      {workout.exercises && workout.exercises.length > 0 ? (
                        <div className="space-y-2">
                          {workout.exercises.map((ex) => (
                            <div 
                              key={ex.id}
                              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                            >
                              <span className="font-medium text-sm">{ex.exercise_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {ex.sets} × {ex.reps || "-"} reps
                                {ex.weight_kg && ` @ ${ex.weight_kg}kg`}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No exercises logged</p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(workout.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Workout
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MemberLayout>
  );
}
