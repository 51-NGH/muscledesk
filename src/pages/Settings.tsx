import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Save, Shield } from "lucide-react";

export default function Settings() {
  const { user, gymId, role, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [gymData, setGymData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gymData.name) {
      toast.error("Gym name is required");
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from("gyms")
        .insert([{
          name: gymData.name,
          phone: gymData.phone || null,
          email: gymData.email || null,
          address: gymData.address || null,
          owner_id: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Gym created successfully!");
      queryClient.invalidateQueries({ queryKey: ["gyms"] });
      
      // Refresh the page to update gym context
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to create gym");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Settings" description="Manage your gym settings" />

      <div className="max-w-2xl">
        {!gymId ? (
          // Create Gym Form
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Create Your Gym</h2>
                <p className="text-sm text-muted-foreground">Set up your gym to start managing members</p>
              </div>
            </div>

            <form onSubmit={handleCreateGym} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Gym Name *</Label>
                <Input
                  id="name"
                  value={gymData.name}
                  onChange={(e) => setGymData({ ...gymData, name: e.target.value })}
                  placeholder="FitZone Gym"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={gymData.phone}
                  onChange={(e) => setGymData({ ...gymData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={gymData.email}
                  onChange={(e) => setGymData({ ...gymData, email: e.target.value })}
                  placeholder="contact@fitzonegym.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={gymData.address}
                  onChange={(e) => setGymData({ ...gymData, address: e.target.value })}
                  placeholder="123 Main Street, City"
                />
              </div>

              <Button type="submit" disabled={isCreating} className="w-full">
                {isCreating ? "Creating..." : "Create Gym"}
              </Button>
            </form>
          </div>
        ) : (
          // Gym Settings
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Gym Information</h2>
                  <p className="text-sm text-muted-foreground">Your gym details</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium text-foreground">{user?.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Role</span>
                  <p className="font-medium text-foreground capitalize">{role?.replace("_", " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gym ID</span>
                  <p className="font-medium text-foreground font-mono text-xs">{gymId}</p>
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-md-orange/20">
                    <Shield className="h-5 w-5 text-md-orange" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Super Admin Panel</h2>
                    <p className="text-sm text-muted-foreground">Manage all gyms and plans</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Super admin features coming soon: View all gyms, assign plans, lock/unlock features.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
