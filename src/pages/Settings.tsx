import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { user, gymId, role, isSuperAdmin } = useAuth();

  // Fetch gym details if gymId exists
  const { data: gym } = useQuery({
    queryKey: ["gym", gymId],
    queryFn: async () => {
      if (!gymId) return null;
      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .eq("id", gymId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gymId,
  });

  return (
    <DashboardLayout>
      <PageHeader title="Settings" description="Manage your gym settings" />

      <div className="max-w-2xl space-y-6">
        {!gymId ? (
          // No Gym Assigned - Contact SuperAdmin
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">No Gym Assigned</h2>
                <p className="text-sm text-muted-foreground">Your account is not linked to any gym</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Gym creation is managed by the MuscleDesk SuperAdmin for security and billing purposes.
              </p>
              <p>
                <strong>To get started:</strong> Contact the MuscleDesk support team with your registered email 
                (<span className="font-mono text-foreground">{user?.email}</span>) to have your gym created and assigned.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-xs">
                  📧 Once your gym is created, refresh this page to access all features.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Gym Settings
          <>
            {/* Gym Info Card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Gym Information</h2>
                  <p className="text-sm text-muted-foreground">{gym?.name || "Your gym"}</p>
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
                  <span className="text-muted-foreground">Plan</span>
                  <p className="font-medium text-foreground capitalize">{gym?.plan || "lite"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Member Limit</span>
                  <p className="font-medium text-foreground">{gym?.member_limit || 100}</p>
                </div>
                {gym?.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p className="font-medium text-foreground">{gym.phone}</p>
                  </div>
                )}
                {gym?.address && (
                  <div>
                    <span className="text-muted-foreground">Address</span>
                    <p className="font-medium text-foreground">{gym.address}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Gym is active and operational</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* SuperAdmin Panel */}
        {isSuperAdmin && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-md-orange/20">
                <Shield className="h-5 w-5 text-md-orange" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Super Admin Panel</h2>
                <p className="text-sm text-muted-foreground">Platform management tools</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Use the following SQL RPC functions to manage the platform:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 font-mono text-xs">
                <li><code>admin_create_gym(name, owner_email, plan, city, phone, address)</code></li>
                <li><code>admin_assign_role(user_id, role)</code></li>
              </ul>
              <p className="mt-3">
                Gym owners must sign up first, then you assign them a gym using their email.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
