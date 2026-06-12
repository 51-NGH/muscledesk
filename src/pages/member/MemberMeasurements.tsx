import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { invokeMemberPortal, invokeMemberAuth } from "@/lib/memberPortalClient";
import { format, parseISO } from "date-fns";
import { 
  Ruler, Plus, Trash2, Loader2, TrendingUp, TrendingDown, 
  Scale, X, Check, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { mapDatabaseError } from "@/lib/errorMapper";

interface Measurement {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_percent: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  bicep_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
  created_at: string;
}

export default function MemberMeasurements() {
  const { member, loading, memberLoading } = useMemberAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMeasurement, setNewMeasurement] = useState({
    weight_kg: "",
    height_cm: "",
    body_fat_percent: "",
    chest_cm: "",
    waist_cm: "",
    hips_cm: "",
    bicep_cm: "",
    thigh_cm: "",
    notes: ""
  });

  const { data: measurements, isLoading } = useQuery({
    queryKey: ["member-measurements", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await invokeMemberPortal( {
        body: { action: "get-measurements", member_id: member.id }
      });
      if (error) throw error;
      return (data?.measurements || []) as Measurement[];
    },
    enabled: !!member,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not logged in");
      const { data, error } = await invokeMemberPortal( {
        body: {
          action: "add-measurement",
          member_id: member.id,
          data: {
            weight_kg: newMeasurement.weight_kg ? parseFloat(newMeasurement.weight_kg) : null,
            height_cm: newMeasurement.height_cm ? parseFloat(newMeasurement.height_cm) : null,
            body_fat_percent: newMeasurement.body_fat_percent ? parseFloat(newMeasurement.body_fat_percent) : null,
            chest_cm: newMeasurement.chest_cm ? parseFloat(newMeasurement.chest_cm) : null,
            waist_cm: newMeasurement.waist_cm ? parseFloat(newMeasurement.waist_cm) : null,
            hips_cm: newMeasurement.hips_cm ? parseFloat(newMeasurement.hips_cm) : null,
            bicep_cm: newMeasurement.bicep_cm ? parseFloat(newMeasurement.bicep_cm) : null,
            thigh_cm: newMeasurement.thigh_cm ? parseFloat(newMeasurement.thigh_cm) : null,
            notes: newMeasurement.notes || null
          }
        }
      });
      if (error || !data?.success) throw new Error(data?.error || "Failed to save");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-measurements"] });
      setShowAddForm(false);
      setNewMeasurement({
        weight_kg: "", height_cm: "", body_fat_percent: "",
        chest_cm: "", waist_cm: "", hips_cm: "", bicep_cm: "", thigh_cm: "", notes: ""
      });
      toast.success("Measurement recorded! 📏");
    },
    onError: (error) => {
      toast.error(mapDatabaseError(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (measurementId: string) => {
      if (!member) throw new Error("Not logged in");
      const { data, error } = await invokeMemberPortal( {
        body: {
          action: "delete-measurement",
          member_id: member.id,
          data: { measurement_id: measurementId }
        }
      });
      if (error || !data?.success) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-measurements"] });
      toast.success("Measurement deleted");
    }
  });

  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Body Stats">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  const latest = measurements?.[0];
  const previous = measurements?.[1];
  const weightChange = latest?.weight_kg && previous?.weight_kg 
    ? latest.weight_kg - previous.weight_kg 
    : null;

  const bmi = latest?.weight_kg && latest?.height_cm
    ? (latest.weight_kg / Math.pow(latest.height_cm / 100, 2)).toFixed(1)
    : null;

  // Chart data (reversed for chronological order)
  const chartData = measurements?.slice(0, 10).reverse().map(m => ({
    date: format(parseISO(m.measured_at), "MMM d"),
    weight: m.weight_kg,
    bodyFat: m.body_fat_percent
  })) || [];

  return (
    <MemberLayout title="Body Stats">
      <div className="space-y-5 animate-fade-in">
        {/* Stats Header */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-[hsl(var(--md-teal))] to-[hsl(var(--md-teal))]/80 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <Scale className="h-4 w-4" />
              Weight
            </div>
            <p className="text-2xl font-bold">
              {latest?.weight_kg ? `${latest.weight_kg} kg` : "—"}
            </p>
            {weightChange !== null && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${weightChange > 0 ? "text-white/80" : "text-white/80"}`}>
                {weightChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-primary-foreground">
            <div className="flex items-center gap-2 text-primary-foreground/70 text-xs mb-1">
              <Activity className="h-4 w-4" />
              BMI
            </div>
            <p className="text-2xl font-bold">{bmi || "—"}</p>
            {bmi && (
              <p className="text-xs text-primary-foreground/70 mt-1">
                {parseFloat(bmi) < 18.5 ? "Underweight" : 
                 parseFloat(bmi) < 25 ? "Normal" : 
                 parseFloat(bmi) < 30 ? "Overweight" : "Obese"}
              </p>
            )}
          </div>
        </div>

        {/* Weight Chart */}
        {chartData.length > 1 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm">Weight Progress</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Add Measurement Button */}
        {!showAddForm && (
          <Button 
            className="w-full h-12 rounded-xl"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Measurement
          </Button>
        )}

        {/* Add Measurement Form */}
        {showAddForm && (
          <Card className="p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">New Measurement</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Weight (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="70.5"
                    value={newMeasurement.weight_kg}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, weight_kg: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Height (cm)</label>
                  <Input
                    type="number"
                    placeholder="175"
                    value={newMeasurement.height_cm}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, height_cm: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Body Fat %</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="15"
                    value={newMeasurement.body_fat_percent}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, body_fat_percent: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Chest (cm)</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={newMeasurement.chest_cm}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, chest_cm: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Waist (cm)</label>
                  <Input
                    type="number"
                    placeholder="80"
                    value={newMeasurement.waist_cm}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, waist_cm: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Hips (cm)</label>
                  <Input
                    type="number"
                    placeholder="95"
                    value={newMeasurement.hips_cm}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, hips_cm: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Bicep (cm)</label>
                  <Input
                    type="number"
                    placeholder="35"
                    value={newMeasurement.bicep_cm}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, bicep_cm: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Thigh (cm)</label>
                  <Input
                    type="number"
                    placeholder="55"
                    value={newMeasurement.thigh_cm}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, thigh_cm: e.target.value }))}
                  />
                </div>
              </div>

              <Button 
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newMeasurement.weight_kg}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Measurement
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Measurement History */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <Ruler className="h-4 w-4 text-primary" />
            Measurement History
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !measurements || measurements.length === 0 ? (
            <Card className="p-8 text-center">
              <Ruler className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No measurements yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Track your body progress!
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {measurements.map((m, idx) => (
                <Card 
                  key={m.id} 
                  className="p-4 animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {format(parseISO(m.measured_at), "MMMM d, yyyy")}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {m.weight_kg && (
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            {m.weight_kg} kg
                          </span>
                        )}
                        {m.body_fat_percent && (
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            {m.body_fat_percent}% fat
                          </span>
                        )}
                        {m.chest_cm && (
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            Chest: {m.chest_cm}cm
                          </span>
                        )}
                        {m.waist_cm && (
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            Waist: {m.waist_cm}cm
                          </span>
                        )}
                        {m.bicep_cm && (
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            Bicep: {m.bicep_cm}cm
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(m.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MemberLayout>
  );
}
