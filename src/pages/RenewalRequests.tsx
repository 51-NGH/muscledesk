import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import {
  RefreshCw,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  MessageSquare,
  Calendar,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RenewalRequest {
  id: string;
  member_id: string;
  gym_id: string;
  preferred_plan_id: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  members: {
    id: string;
    full_name: string;
    member_id: string;
    phone: string;
    email: string | null;
    plan_name: string | null;
    expiry_date: string;
    status: string;
  };
  preferred_plan: {
    id: string;
    name: string;
    price: number;
    duration_days: number;
  } | null;
}

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
}

const statusConfig = {
  pending: { 
    label: "Pending", 
    variant: "secondary" as const, 
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  approved: { 
    label: "Approved", 
    variant: "default" as const, 
    icon: CheckCircle2,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  rejected: { 
    label: "Rejected", 
    variant: "destructive" as const, 
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10"
  },
  completed: { 
    label: "Completed", 
    variant: "default" as const, 
    icon: Sparkles,
    color: "text-green-500",
    bg: "bg-green-500/10"
  },
};

export default function RenewalRequests() {
  const { user, gymId } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedRequest, setSelectedRequest] = useState<RenewalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "process" | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "card">("cash");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "completed">("pending");

  // Fetch renewal requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["renewal-requests", gymId, filter],
    queryFn: async () => {
      if (!gymId) return [];
      
      let query = supabase
        .from("renewal_requests")
        .select(`
          *,
          members!inner(id, full_name, member_id, phone, email, plan_name, expiry_date, status),
          preferred_plan:membership_plans(id, name, price, duration_days)
        `)
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      
      if (filter !== "all") {
        query = query.eq("status", filter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as RenewalRequest[];
    },
    enabled: !!gymId,
  });

  // Fetch membership plans
  const { data: plans } = useQuery({
    queryKey: ["membership-plans", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("gym_id", gymId)
        .eq("is_active", true)
        .order("price");
      if (error) throw error;
      return data as MembershipPlan[];
    },
    enabled: !!gymId,
  });

  // Update request status mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ 
      requestId, 
      status, 
      adminResponse 
    }: { 
      requestId: string; 
      status: string; 
      adminResponse?: string;
    }) => {
      const { error } = await supabase
        .from("renewal_requests")
        .update({
          status,
          admin_response: adminResponse || null,
          responded_by: user?.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewal-requests"] });
      toast.success(actionType === "reject" ? "Request rejected" : "Request approved");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to update request");
      console.error(error);
    },
  });

  // Process renewal (renew membership) mutation
  const processRenewalMutation = useMutation({
    mutationFn: async ({ 
      memberId, 
      planId, 
      amount, 
      paymentMode 
    }: { 
      memberId: string; 
      planId?: string; 
      amount?: number; 
      paymentMode: "cash" | "upi" | "card";
    }) => {
      const { data, error } = await supabase.rpc("renew_membership", {
        _member_id: memberId,
        _plan_id: planId || null,
        _amount: amount || null,
        _payment_mode: paymentMode,
        _notes: `Renewed via member request`,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (_, variables) => {
      // Mark request as completed
      if (selectedRequest) {
        await supabase
          .from("renewal_requests")
          .update({
            status: "completed",
            admin_response: adminResponse || "Membership renewed successfully",
            responded_by: user?.id,
            responded_at: new Date().toISOString(),
          })
          .eq("id", selectedRequest.id);
      }
      
      queryClient.invalidateQueries({ queryKey: ["renewal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Membership renewed successfully! 🎉");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to process renewal");
      console.error(error);
    },
  });

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setAdminResponse("");
    setSelectedPlan("");
    setCustomAmount("");
    setPaymentMode("cash");
  };

  const handleApprove = (request: RenewalRequest) => {
    setSelectedRequest(request);
    setActionType("approve");
    if (request.preferred_plan_id) {
      setSelectedPlan(request.preferred_plan_id);
    }
  };

  const handleReject = (request: RenewalRequest) => {
    setSelectedRequest(request);
    setActionType("reject");
  };

  const handleProcess = (request: RenewalRequest) => {
    setSelectedRequest(request);
    setActionType("process");
    if (request.preferred_plan_id) {
      setSelectedPlan(request.preferred_plan_id);
    }
  };

  const confirmAction = () => {
    if (!selectedRequest) return;

    if (actionType === "reject") {
      updateRequestMutation.mutate({
        requestId: selectedRequest.id,
        status: "rejected",
        adminResponse,
      });
    } else if (actionType === "approve") {
      updateRequestMutation.mutate({
        requestId: selectedRequest.id,
        status: "approved",
        adminResponse: adminResponse || "Your renewal request has been approved. Please visit the gym to complete payment.",
      });
    } else if (actionType === "process") {
      const plan = plans?.find(p => p.id === selectedPlan);
      processRenewalMutation.mutate({
        memberId: selectedRequest.member_id,
        planId: selectedPlan || undefined,
        amount: customAmount ? parseFloat(customAmount) : plan?.price,
        paymentMode,
      });
    }
  };

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Renewal Requests"
          description="Manage membership renewal requests from members"
        />

        {/* Stats & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                {pendingCount} pending request{pendingCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
          
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <Card className="p-12 text-center">
            <RefreshCw className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No renewal requests</h3>
            <p className="text-muted-foreground mt-1">
              {filter === "pending" 
                ? "No pending requests at the moment" 
                : "No requests found with this filter"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const config = statusConfig[request.status];
              const StatusIcon = config.icon;
              const isExpired = new Date(request.members.expiry_date) < new Date();
              
              return (
                <Card 
                  key={request.id} 
                  className={cn(
                    "p-4 sm:p-5 transition-all hover:shadow-md",
                    request.status === "pending" && "border-amber-500/30 bg-amber-500/5"
                  )}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Member Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", config.bg)}>
                        <User className={cn("h-5 w-5", config.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{request.members.full_name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {request.members.member_id}
                          </Badge>
                          <Badge variant={config.variant} className="text-xs">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {request.members.phone}
                          </span>
                          {request.members.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {request.members.email}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <CreditCard className="h-3.5 w-3.5" />
                            {request.members.plan_name || "No plan"}
                          </span>
                          <span className={cn(
                            "flex items-center gap-1",
                            isExpired ? "text-destructive" : "text-muted-foreground"
                          )}>
                            <Calendar className="h-3.5 w-3.5" />
                            {isExpired ? "Expired " : "Expires "}
                            {format(parseISO(request.members.expiry_date), "MMM d, yyyy")}
                          </span>
                        </div>

                        {/* Preferred Plan */}
                        {request.preferred_plan && (
                          <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                            <Sparkles className="h-3 w-3" />
                            Wants: {request.preferred_plan.name} (₹{request.preferred_plan.price})
                          </div>
                        )}

                        {/* Member Message */}
                        {request.message && (
                          <div className="mt-2 p-2 rounded bg-muted text-sm">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                              <p className="text-muted-foreground">{request.message}</p>
                            </div>
                          </div>
                        )}

                        {/* Admin Response */}
                        {request.admin_response && (
                          <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20 text-sm">
                            <p className="text-primary font-medium text-xs mb-1">Your response:</p>
                            <p>{request.admin_response}</p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          Requested {formatDistanceToNow(parseISO(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {request.status === "pending" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(request)}
                          className="text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(request)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleProcess(request)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Process Now
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}

                    {request.status === "approved" && (
                      <Button
                        size="sm"
                        onClick={() => handleProcess(request)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Process Renewal
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "reject" && "Reject Request"}
              {actionType === "approve" && "Approve Request"}
              {actionType === "process" && "Process Renewal"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span>
                  For <strong>{selectedRequest.members.full_name}</strong> ({selectedRequest.members.member_id})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Process Renewal Options */}
            {actionType === "process" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Plan</label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - ₹{plan.price} ({plan.duration_days} days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Amount (Optional)</label>
                  <Input
                    type="number"
                    placeholder={selectedPlan ? `Default: ₹${plans?.find(p => p.id === selectedPlan)?.price || 0}` : "Enter amount"}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Mode</label>
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as typeof paymentMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Response Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {actionType === "reject" ? "Rejection Reason" : "Response Message"} 
                {actionType !== "reject" && <span className="text-muted-foreground">(Optional)</span>}
              </label>
              <Textarea
                placeholder={
                  actionType === "reject" 
                    ? "Explain why the request was rejected..." 
                    : "Add a message for the member..."
                }
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button 
              onClick={confirmAction}
              disabled={
                updateRequestMutation.isPending || 
                processRenewalMutation.isPending ||
                (actionType === "process" && !selectedPlan)
              }
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {(updateRequestMutation.isPending || processRenewalMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionType === "reject" && "Reject Request"}
              {actionType === "approve" && "Approve Request"}
              {actionType === "process" && "Process Renewal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
