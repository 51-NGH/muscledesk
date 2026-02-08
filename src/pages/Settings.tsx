import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Shield, AlertTriangle, CheckCircle2, Volume2, VolumeX, Bell, BellOff, Lock, ClipboardList, Crown, Mail, User, MapPin, Phone, CreditCard, Users, Play, Gauge, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSoundSettings } from "@/hooks/useSoundSettings";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useAudioFeedback } from "@/hooks/useAudioFeedback";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { AuditLogsViewer } from "@/components/AuditLogsViewer";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user, gymId, role, isSuperAdmin } = useAuth();
  const { settings, toggleSound, setVolume, toggleApproveSound, toggleDenySound } = useSoundSettings();
  const { playSound } = useAudioFeedback(settings);
  const { data: features } = useGymPlanFeatures();
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);

  const hasQRSounds = features?.hasQRAttendance ?? false;
  const hasAuditLogs = features?.hasAuditLogs ?? false;

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

      {!gymId ? (
        <div className="max-w-xl mx-auto">
          <div className="rounded-2xl border border-[hsl(var(--md-orange))]/30 bg-[hsl(var(--md-orange))]/5 p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--md-orange))]/15 shadow-sm">
                <AlertTriangle className="h-6 w-6 text-[hsl(var(--md-orange))]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">No Gym Assigned</h2>
                <p className="text-sm text-muted-foreground">Your account is not linked to any gym</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Contact the MuscleDesk support team with your registered email (<span className="font-mono text-foreground">{user?.email}</span>) to have your gym created and assigned.</p>
              <div className="mt-4 p-3 rounded-xl bg-muted/50 text-xs">
                📧 Once your gym is created, refresh this page to access all features.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
          {/* LEFT COLUMN — Gym Profile */}
          <div className="lg:col-span-5 space-y-5">
            {/* Gym Info Card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden h-fit">
              <div className="relative px-6 pt-6 pb-5">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm border border-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{gym?.name || "Your Gym"}</h2>
                    <p className="text-xs text-muted-foreground">Gym Profile & Information</p>
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-0">
                  <InfoRow icon={Mail} label="Email" value={user?.email || "—"} />
                  <InfoRow icon={User} label="Role" value={role?.replace("_", " ") || "—"} capitalize />
                  <InfoRow icon={CreditCard} label="Plan" value={gym?.plan || "lite"} capitalize badge />
                  <InfoRow icon={Users} label="Member Limit" value={String(gym?.member_limit || 100)} />
                  {gym?.phone && <InfoRow icon={Phone} label="Phone" value={gym.phone} />}
                  {gym?.address && <InfoRow icon={MapPin} label="Address" value={gym.address} />}
                </div>
              </div>

              {/* Status Footer */}
              <div className="px-6 py-3.5 bg-muted/30 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--md-green))] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--md-green))]" />
                  </div>
                  <span className="text-xs text-muted-foreground">Gym is active and operational</span>
                </div>
              </div>
            </div>

            {/* Audit Logs */}
            {hasAuditLogs && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="relative px-6 py-5">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-md-purple via-md-purple/70 to-md-purple/40" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-md-purple/15 to-md-purple/5 shadow-sm border border-md-purple/10">
                      <ClipboardList className="h-5 w-5 text-md-purple" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-foreground">Audit Logs</h2>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-md-purple/10 text-md-purple text-[10px] font-bold uppercase tracking-wider">
                          <Crown className="h-2.5 w-2.5" />
                          Pro
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Track all admin actions and changes</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-md-purple/20 hover:bg-md-purple/5 hover:border-md-purple/30 transition-all"
                      onClick={() => setIsAuditLogsOpen(true)}
                    >
                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                      View Logs
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* SuperAdmin Panel */}
            {isSuperAdmin && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="relative px-6 pt-6 pb-4">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(var(--md-orange))] via-[hsl(var(--md-orange))]/70 to-[hsl(var(--md-orange))]/40" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--md-orange))]/15 to-[hsl(var(--md-orange))]/5 shadow-sm border border-[hsl(var(--md-orange))]/10">
                      <Shield className="h-5 w-5 text-[hsl(var(--md-orange))]" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">Super Admin Panel</h2>
                      <p className="text-xs text-muted-foreground">Platform management tools</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-3 text-sm text-muted-foreground">
                    <p>Use the following SQL RPC functions:</p>
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="p-2 rounded-lg bg-background border border-border/50">
                        <code>admin_create_gym(name, owner_email, plan, city, phone, address)</code>
                      </div>
                      <div className="p-2 rounded-lg bg-background border border-border/50">
                        <code>admin_assign_role(user_id, role)</code>
                      </div>
                    </div>
                    <p className="text-xs">Gym owners must sign up first, then assign them a gym.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Preferences */}
          <div className="lg:col-span-7 space-y-5">
            {/* QR Scanner Sounds */}
            {hasQRSounds ? (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="relative px-6 pt-6 pb-4">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-md-teal via-md-teal/70 to-md-teal/40" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-md-teal/15 to-md-teal/5 shadow-sm border border-md-teal/10">
                        {settings.enabled ? (
                          <Volume2 className="h-5 w-5 text-md-teal" />
                        ) : (
                          <VolumeX className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">QR Scanner Sounds</h2>
                        <p className="text-xs text-muted-foreground">Audio feedback for scans</p>
                      </div>
                    </div>
                    <Switch checked={settings.enabled} onCheckedChange={toggleSound} />
                  </div>
                </div>

                {settings.enabled && (
                  <div className="px-6 pb-6 space-y-5">
                    {/* Volume */}
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gauge className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">Volume</p>
                        </div>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {settings.volume}%
                        </span>
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

                    {/* Sound Toggles in a 2-col grid on large */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SoundCard
                        title="Approval Sound"
                        description="Successful scan feedback"
                        icon={<CheckCircle2 className="h-4 w-4 text-[hsl(var(--md-green))]" />}
                        iconBg="bg-[hsl(var(--md-green))]/10"
                        checked={settings.approveSound}
                        onCheckedChange={toggleApproveSound}
                        onTest={() => playSound('approve')}
                      />
                      <SoundCard
                        title="Denial Sound"
                        description="Failed scan feedback"
                        icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                        iconBg="bg-destructive/10"
                        checked={settings.denySound}
                        onCheckedChange={toggleDenySound}
                        onTest={() => playSound('deny')}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden relative">
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-3">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground">QR Scanner Sounds</p>
                  <p className="text-xs text-muted-foreground mt-1">Upgrade to Standard plan to unlock</p>
                </div>
                <div className="opacity-20 px-6 py-10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-md-teal/15">
                      <Volume2 className="h-5 w-5 text-md-teal" />
                    </div>
                    <div>
                      <h2 className="font-semibold">QR Scanner Sounds</h2>
                      <p className="text-sm text-muted-foreground">Customize audio feedback</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AuditLogsViewer isOpen={isAuditLogsOpen} onClose={() => setIsAuditLogsOpen(false)} />
    </DashboardLayout>
  );
}

/* ---------- Sub-components ---------- */

function InfoRow({ icon: Icon, label, value, capitalize, badge }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
  badge?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      <span className="text-xs text-muted-foreground w-24 shrink-0 uppercase tracking-wider">{label}</span>
      <div className="flex-1 min-w-0">
        {badge ? (
          <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
            "bg-primary/10 text-primary capitalize"
          )}>
            <Sparkles className="h-3 w-3" />
            {value}
          </span>
        ) : (
          <p className={cn("text-sm font-medium text-foreground truncate", capitalize && "capitalize")}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function SoundCard({ title, description, icon, iconBg, checked, onCheckedChange, onTest }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  checked: boolean;
  onCheckedChange: () => void;
  onTest: () => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-border/50 transition-all hover:bg-muted/30 hover:border-border space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={onTest}
        >
          <Play className="h-3 w-3 mr-1" />
          Preview
        </Button>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}
