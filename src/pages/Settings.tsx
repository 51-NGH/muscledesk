import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Shield, AlertTriangle, CheckCircle2, Volume2, VolumeX, Bell, BellOff, Lock, ClipboardList, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSoundSettings } from "@/hooks/useSoundSettings";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useAudioFeedback } from "@/hooks/useAudioFeedback";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { AuditLogsViewer } from "@/components/AuditLogsViewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Settings() {
  const { user, gymId, role, isSuperAdmin } = useAuth();
  const { settings, toggleSound, setVolume, toggleApproveSound, toggleDenySound } = useSoundSettings();
  const { playSound } = useAudioFeedback(settings);
  const { data: features } = useGymPlanFeatures();
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);

  // Check if QR sounds should be available (Standard+ only)
  const hasQRSounds = features?.hasQRAttendance ?? false;
  const hasAuditLogs = features?.hasAuditLogs ?? false;

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

            {/* Sound Settings Section - Only for Standard+ */}
            {hasQRSounds ? (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-md-teal/20">
                    {settings.enabled ? (
                      <Volume2 className="h-5 w-5 text-md-teal" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">QR Scanner Sounds</h2>
                    <p className="text-sm text-muted-foreground">Customize audio feedback for QR scans</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settings.enabled ? (
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Enable Sounds</p>
                        <p className="text-xs text-muted-foreground">Turn all scanner sounds on/off</p>
                      </div>
                    </div>
                    <Switch checked={settings.enabled} onCheckedChange={toggleSound} />
                  </div>

                  {settings.enabled && (
                    <>
                      {/* Volume Slider */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Volume</p>
                          <span className="text-sm text-muted-foreground">{settings.volume}%</span>
                        </div>
                        <Slider
                          value={[settings.volume]}
                          onValueChange={([value]) => setVolume(value)}
                          max={100}
                          min={10}
                          step={10}
                          className="w-full"
                        />
                      </div>

                      {/* Individual Sound Toggles */}
                      <div className="pt-3 border-t border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-md-green">Approval Sound</p>
                            <p className="text-xs text-muted-foreground">Plays when QR scan is successful</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => playSound('approve')}
                              className="text-xs text-primary hover:underline"
                            >
                              Test
                            </button>
                            <Switch checked={settings.approveSound} onCheckedChange={toggleApproveSound} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-destructive">Denial Sound</p>
                            <p className="text-xs text-muted-foreground">Plays when QR scan fails</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => playSound('deny')}
                              className="text-xs text-primary hover:underline"
                            >
                              Test
                            </button>
                            <Switch checked={settings.denySound} onCheckedChange={toggleDenySound} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="font-semibold text-foreground">QR Scanner Sounds</p>
                  <p className="text-sm text-muted-foreground">Upgrade to Standard plan to unlock</p>
                </div>
                <div className="opacity-30">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-md-teal/20">
                      <Volume2 className="h-5 w-5 text-md-teal" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">QR Scanner Sounds</h2>
                      <p className="text-sm text-muted-foreground">Customize audio feedback for QR scans</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Section - Pro only */}
            {hasAuditLogs && (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-md-purple/20">
                    <ClipboardList className="h-5 w-5 text-md-purple" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-foreground">Audit Logs</h2>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-md-purple/10 text-md-purple text-xs font-medium">
                        <Crown className="h-3 w-3" />
                        Pro
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Track all admin actions and changes</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsAuditLogsOpen(true)}>
                    View Logs
                  </Button>
                </div>
              </div>
            )}
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

      {/* Audit Logs Dialog */}
      <Dialog open={isAuditLogsOpen} onOpenChange={setIsAuditLogsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Audit Logs</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <AuditLogsViewer />
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
