import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Edit2, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface PlanLimit {
  plan: string;
  member_limit: number;
  has_expense_tracking: boolean;
  has_advanced_analytics: boolean;
  has_automated_alerts: boolean;
  has_staff_management: boolean;
  has_multi_branch: boolean;
}

export function PlanManagement() {
  const [editingPlan, setEditingPlan] = useState<PlanLimit | null>(null);
  const [formData, setFormData] = useState<PlanLimit | null>(null);

  const queryClient = useQueryClient();

  // Fetch plan limits
  const { data: planLimits, isLoading } = useQuery({
    queryKey: ["super-admin-plan-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*")
        .order("member_limit", { ascending: true });
      if (error) throw error;
      return data as PlanLimit[];
    },
  });

  // Update plan mutation - Note: plan_limits table doesn't allow updates via RLS currently
  // This would require a migration to add update policies for super_admin
  const updatePlanMutation = useMutation({
    mutationFn: async (data: PlanLimit) => {
      // For now, we can only view plans. To update, we'd need to add RLS policies
      toast.info("Plan editing requires database migration for RLS policies");
      throw new Error("Plan editing not yet enabled");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-plan-limits"] });
      toast.success("Plan updated successfully");
      setEditingPlan(null);
      setFormData(null);
    },
    onError: (error) => {
      // Don't show error for the info message
    },
  });

  const openEditDialog = (plan: PlanLimit) => {
    setEditingPlan(plan);
    setFormData({ ...plan });
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "lite":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "standard":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "pro":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "";
    }
  };

  const FeatureIcon = ({ enabled }: { enabled: boolean }) => (
    enabled ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground" />
    )
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Plan Management
        </CardTitle>
        <CardDescription>
          View and configure plan limits and features
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Plan Cards View */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {planLimits?.map((plan) => (
            <Card key={plan.plan} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-2 ${
                plan.plan === "lite" ? "bg-gray-400" : 
                plan.plan === "standard" ? "bg-blue-500" : "bg-purple-500"
              }`} />
              <CardHeader className="pt-6">
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{plan.plan}</span>
                  <Badge className={getPlanColor(plan.plan)}>
                    {plan.member_limit === 10000 ? "Unlimited" : `${plan.member_limit} members`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Expense Tracking</span>
                  <FeatureIcon enabled={plan.has_expense_tracking} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Advanced Analytics</span>
                  <FeatureIcon enabled={plan.has_advanced_analytics} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Automated Alerts</span>
                  <FeatureIcon enabled={plan.has_automated_alerts} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Staff Management</span>
                  <FeatureIcon enabled={plan.has_staff_management} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Multi-Branch</span>
                  <FeatureIcon enabled={plan.has_multi_branch} />
                </div>
                <div className="pt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => openEditDialog(plan)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="capitalize">Edit {plan.plan} Plan</DialogTitle>
                        <DialogDescription>
                          Modify plan limits and features
                        </DialogDescription>
                      </DialogHeader>
                      {formData && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Member Limit</Label>
                            <Input
                              type="number"
                              value={formData.member_limit}
                              onChange={(e) => setFormData({ ...formData, member_limit: parseInt(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="expense_tracking">Expense Tracking</Label>
                              <Switch
                                id="expense_tracking"
                                checked={formData.has_expense_tracking}
                                onCheckedChange={(checked) => setFormData({ ...formData, has_expense_tracking: checked })}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="advanced_analytics">Advanced Analytics</Label>
                              <Switch
                                id="advanced_analytics"
                                checked={formData.has_advanced_analytics}
                                onCheckedChange={(checked) => setFormData({ ...formData, has_advanced_analytics: checked })}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="automated_alerts">Automated Alerts</Label>
                              <Switch
                                id="automated_alerts"
                                checked={formData.has_automated_alerts}
                                onCheckedChange={(checked) => setFormData({ ...formData, has_automated_alerts: checked })}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="staff_management">Staff Management</Label>
                              <Switch
                                id="staff_management"
                                checked={formData.has_staff_management}
                                onCheckedChange={(checked) => setFormData({ ...formData, has_staff_management: checked })}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="multi_branch">Multi-Branch</Label>
                              <Switch
                                id="multi_branch"
                                checked={formData.has_multi_branch}
                                onCheckedChange={(checked) => setFormData({ ...formData, has_multi_branch: checked })}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setFormData(null)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={() => formData && updatePlanMutation.mutate(formData)}
                              disabled={updatePlanMutation.isPending}
                            >
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                {planLimits?.map((plan) => (
                  <TableHead key={plan.plan} className="text-center capitalize">
                    {plan.plan}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Member Limit</TableCell>
                {planLimits?.map((plan) => (
                  <TableCell key={plan.plan} className="text-center">
                    {plan.member_limit === 10000 ? "Unlimited" : plan.member_limit}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Expense Tracking</TableCell>
                {planLimits?.map((plan) => (
                  <TableCell key={plan.plan} className="text-center">
                    <div className="flex justify-center">
                      <FeatureIcon enabled={plan.has_expense_tracking} />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Advanced Analytics</TableCell>
                {planLimits?.map((plan) => (
                  <TableCell key={plan.plan} className="text-center">
                    <div className="flex justify-center">
                      <FeatureIcon enabled={plan.has_advanced_analytics} />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Automated Alerts</TableCell>
                {planLimits?.map((plan) => (
                  <TableCell key={plan.plan} className="text-center">
                    <div className="flex justify-center">
                      <FeatureIcon enabled={plan.has_automated_alerts} />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Staff Management</TableCell>
                {planLimits?.map((plan) => (
                  <TableCell key={plan.plan} className="text-center">
                    <div className="flex justify-center">
                      <FeatureIcon enabled={plan.has_staff_management} />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Multi-Branch</TableCell>
                {planLimits?.map((plan) => (
                  <TableCell key={plan.plan} className="text-center">
                    <div className="flex justify-center">
                      <FeatureIcon enabled={plan.has_multi_branch} />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> To enable plan editing, a database migration is needed to add update policies for the plan_limits table.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
