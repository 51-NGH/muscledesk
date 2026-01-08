import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useMembershipPlans, useCreatePlan, useUpdatePlan, useDeletePlan, MembershipPlan } from "@/hooks/useGymData";
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Clock,
  IndianRupee,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Plans() {
  const { gymId } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration_days: "",
    description: "",
  });

  const { data: plans = [], isLoading } = useMembershipPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const resetForm = () => {
    setFormData({ name: "", price: "", duration_days: "", description: "" });
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.duration_days) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      await createPlan.mutateAsync({
        name: formData.name,
        price: Number(formData.price),
        duration_days: Number(formData.duration_days),
        description: formData.description || undefined,
      });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      await updatePlan.mutateAsync({
        id: selectedPlan.id,
        name: formData.name,
        price: Number(formData.price),
        duration_days: Number(formData.duration_days),
        description: formData.description || null,
      });
      setIsEditDialogOpen(false);
      setSelectedPlan(null);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;

    try {
      await deletePlan.mutateAsync(selectedPlan.id);
      setIsDeleteDialogOpen(false);
      setSelectedPlan(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const openEditDialog = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      description: plan.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setIsDeleteDialogOpen(true);
  };

  const getDurationLabel = (days: number) => {
    if (days === 30) return "1 Month";
    if (days === 90) return "3 Months";
    if (days === 180) return "6 Months";
    if (days === 365) return "1 Year";
    return `${days} Days`;
  };

  if (!gymId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">No Gym Found</h2>
            <p className="text-muted-foreground">Please wait for your gym to be assigned.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalPlans = plans.length;
  const avgPrice = totalPlans > 0 ? Math.round(plans.reduce((sum, p) => sum + p.price, 0) / totalPlans) : 0;
  const longestPlan = totalPlans > 0 ? Math.max(...plans.map(p => p.duration_days)) : 0;

  return (
    <DashboardLayout>
      <PageHeader title="Membership Plans" description="Create and manage membership plans for your gym">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Plan
        </Button>
      </PageHeader>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Plans</p>
            <p className="text-2xl font-bold text-foreground">{totalPlans}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-md-green/10 flex items-center justify-center">
            <IndianRupee className="h-6 w-6 text-md-green" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Average Price</p>
            <p className="text-2xl font-bold text-foreground">₹{avgPrice.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-md-blue/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-md-blue" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Longest Plan</p>
            <p className="text-2xl font-bold text-foreground">{getDurationLabel(longestPlan)}</p>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 sm:p-6 animate-pulse">
              <div className="h-6 w-32 bg-muted rounded mb-4" />
              <div className="h-10 w-24 bg-muted rounded mb-4" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 sm:p-10 text-center">
          <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Plans Created</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first membership plan to get started</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Plan
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {plans.map((plan, index) => {
              const isPopular = plans.length > 1 && plan.price === Math.max(...plans.map(p => p.price));
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border bg-card p-5 sm:p-6 hover:shadow-lg transition-all group relative ${
                    isPopular ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                  }`}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(plan)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-1 mt-2">{plan.name}</h3>
                  
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
                    <Clock className="h-4 w-4" />
                    <span>{getDurationLabel(plan.duration_days)}</span>
                  </div>
                  
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold text-foreground">₹{plan.price.toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm">/{plan.duration_days} days</span>
                  </div>

                  {/* Price per day calculation */}
                  <div className="mb-4 p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">₹{Math.round(plan.price / plan.duration_days)}</span> per day
                    </p>
                  </div>

                  {plan.description && (
                    <p className="text-sm text-muted-foreground border-t border-border pt-4">
                      {plan.description}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Add New Plan Card */}
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="rounded-xl border-2 border-dashed border-border bg-card/50 p-5 sm:p-6 hover:border-primary/50 hover:bg-card transition-all flex flex-col items-center justify-center min-h-[200px] text-muted-foreground hover:text-primary"
            >
              <Plus className="h-10 w-10 mb-3" />
              <span className="font-medium">Add New Plan</span>
            </button>
          </div>

          {/* Tips Section */}
          <div className="rounded-xl border border-border bg-muted/30 p-6">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">💡</span>
              Pro Tips for Membership Plans
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Offer multiple durations (monthly, quarterly, yearly) to give flexibility
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Longer plans with better per-day rates encourage commitment
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Add clear descriptions to highlight plan benefits
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Consider seasonal promotions with special pricing
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Add Plan Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPlan} className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Monthly, Quarterly, Annual"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1000"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (Days) *</Label>
                <Input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  placeholder="30"
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Plan features and benefits..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPlan.isPending}>
                {createPlan.isPending ? "Creating..." : "Create Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditPlan} className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Monthly, Quarterly, Annual"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1000"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (Days) *</Label>
                <Input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  placeholder="30"
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Plan features and benefits..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePlan.isPending}>
                {updatePlan.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPlan?.name}"? This action cannot be undone.
              Members with this plan will retain their current membership.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePlan.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
