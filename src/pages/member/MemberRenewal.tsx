import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { 
  RefreshCw, Loader2, CreditCard, Send, Check, Clock,
  X, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string | null;
}

interface RenewalRequest {
  id: string;
  status: "pending" | "approved" | "rejected" | "completed";
  message: string | null;
  admin_response: string | null;
  created_at: string;
  responded_at: string | null;
  preferred_plan: MembershipPlan | null;
}

const statusConfig = {
  pending: { color: "text-[hsl(var(--md-orange))]", bg: "bg-[hsl(var(--md-orange))]/10", icon: Clock, label: "Pending" },
  approved: { color: "text-[hsl(var(--md-green))]", bg: "bg-[hsl(var(--md-green))]/10", icon: CheckCircle, label: "Approved" },
  rejected: { color: "text-destructive", bg: "bg-destructive/10", icon: XCircle, label: "Rejected" },
  completed: { color: "text-primary", bg: "bg-primary/10", icon: Check, label: "Completed" }
};

export default function MemberRenewal() {
  const { member, loading, memberLoading } = useMemberAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["member-plans", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: { action: "get-plans", member_id: member.id }
      });
      if (error) throw error;
      return (data?.plans || []) as MembershipPlan[];
    },
    enabled: !!member,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["member-renewal-requests", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: { action: "get-renewal-requests", member_id: member.id }
      });
      if (error) throw error;
      return (data?.requests || []) as RenewalRequest[];
    },
    enabled: !!member,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not logged in");
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: {
          action: "create-renewal-request",
          member_id: member.id,
          data: {
            preferred_plan_id: selectedPlan,
            message: message || null
          }
        }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to submit request");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-renewal-requests"] });
      setShowForm(false);
      setSelectedPlan(null);
      setMessage("");
      toast.success("Renewal request submitted! 📩");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Renew">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  const hasPendingRequest = requests?.some(r => r.status === "pending");

  return (
    <MemberLayout title="Renew">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-[hsl(var(--md-teal))] to-[hsl(var(--md-teal))]/80 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Membership</p>
              <p className="text-2xl font-bold mt-1">Renewal Request</p>
              <p className="text-white/70 text-xs mt-2">
                Request renewal, pay at gym
              </p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center">
              <RefreshCw className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Request Form */}
        {!showForm && !hasPendingRequest && (
          <Button 
            className="w-full h-12 rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Request Renewal
          </Button>
        )}

        {hasPendingRequest && !showForm && (
          <Card className="p-4 bg-[hsl(var(--md-orange))]/10 border-[hsl(var(--md-orange))]/20">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-[hsl(var(--md-orange))]" />
              <div>
                <p className="font-medium text-sm">Request Pending</p>
                <p className="text-xs text-muted-foreground">
                  You already have a pending renewal request
                </p>
              </div>
            </div>
          </Card>
        )}

        {showForm && (
          <Card className="p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Select Plan</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {plansLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !plans || plans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No plans available
              </p>
            ) : (
              <div className="space-y-3">
                {plans.map(plan => (
                  <button
                    key={plan.id}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all",
                      selectedPlan === plan.id 
                        ? "border-primary bg-primary/5 ring-2 ring-primary" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.duration_days} days
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{plan.price}</p>
                        {selectedPlan === plan.id && (
                          <Check className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </div>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {plan.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">Message (optional)</label>
              <Textarea
                placeholder="Any notes for the gym staff..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              className="w-full mt-4"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !selectedPlan}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </Card>
        )}

        {/* Request History */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-primary" />
            Request History
          </h3>

          {requestsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <Card className="p-8 text-center">
              <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No renewal requests</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your renewal request history will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((request, idx) => {
                const config = statusConfig[request.status];
                const Icon = config.icon;

                return (
                  <Card 
                    key={request.id} 
                    className="p-4 animate-slide-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
                              {config.label}
                            </span>
                          </div>
                          {request.preferred_plan && (
                            <p className="font-medium text-sm mt-1">
                              {request.preferred_plan.name} - ₹{request.preferred_plan.price}
                            </p>
                          )}
                          {request.message && (
                            <p className="text-xs text-muted-foreground mt-1">
                              "{request.message}"
                            </p>
                          )}
                          {request.admin_response && (
                            <div className="mt-2 p-2 bg-muted rounded-lg">
                              <p className="text-xs font-medium">Staff Response:</p>
                              <p className="text-xs text-muted-foreground">
                                {request.admin_response}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {format(parseISO(request.created_at), "MMM d")}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MemberLayout>
  );
}
