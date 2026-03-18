import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Phone, Mail, Calendar, Clock, Flame, Snowflake, Zap,
  MessageCircle, PhoneCall, Eye, StickyNote, ArrowUpRight, Trash2,
  CalendarCheck,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useLeadActivities, useUpdateLead, useDeleteLead, useLogLeadActivity, useConvertLead } from "@/hooks/useLeads";
import { useMembershipPlans } from "@/hooks/useGymData";
import type { Lead, LeadStatus, LeadTemperature, LeadActivityType } from "@/hooks/useLeads";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "trial_booked", label: "Trial Booked" },
  { value: "trial_done", label: "Trial Done" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "converted", label: "Converted" },
];

const TEMP_OPTIONS: { value: LeadTemperature; label: string; icon: React.ReactNode }[] = [
  { value: "hot", label: "Hot", icon: <Flame className="h-3.5 w-3.5" /> },
  { value: "warm", label: "Warm", icon: <Zap className="h-3.5 w-3.5" /> },
  { value: "cold", label: "Cold", icon: <Snowflake className="h-3.5 w-3.5" /> },
];

const activityIcons: Record<LeadActivityType, React.ReactNode> = {
  call: <PhoneCall className="h-3.5 w-3.5" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
  visit: <Eye className="h-3.5 w-3.5" />,
  trial: <Calendar className="h-3.5 w-3.5" />,
  note: <StickyNote className="h-3.5 w-3.5" />,
  status_change: <ArrowUpRight className="h-3.5 w-3.5" />,
};

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailDrawer({ lead, open, onOpenChange }: Props) {
  const { data: activities = [], isLoading: activitiesLoading } = useLeadActivities(lead?.id || "");
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const logActivity = useLogLeadActivity();
  const convertLead = useConvertLead();
  const { data: plans = [] } = useMembershipPlans();

  const [activityNote, setActivityNote] = useState("");
  const [activityType, setActivityType] = useState<LeadActivityType>("note");
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertPlanId, setConvertPlanId] = useState("");
  const [convertExpiry, setConvertExpiry] = useState("");

  if (!lead) return null;

  const handleStatusChange = (status: LeadStatus) => {
    updateLead.mutate({ id: lead.id, status });
  };

  const handleTempChange = (temperature: LeadTemperature) => {
    updateLead.mutate({ id: lead.id, temperature });
  };

  const handleTrialDateChange = (dateStr: string) => {
    const trialDate = dateStr ? new Date(dateStr + "T10:00:00").toISOString() : null;
    updateLead.mutate({
      id: lead.id,
      trial_scheduled_at: trialDate,
      ...(dateStr ? { status: "trial_booked" as LeadStatus } : {}),
    });
    if (dateStr) {
      logActivity.mutate({
        lead_id: lead.id,
        activity_type: "trial",
        description: `Trial scheduled for ${format(new Date(dateStr), "dd MMM yyyy")}`,
      });
    }
  };

  const handleLogActivity = () => {
    if (!activityNote.trim()) return;
    logActivity.mutate({
      lead_id: lead.id,
      activity_type: activityType,
      description: activityNote.trim(),
    });
    setActivityNote("");
  };

  const handleConvert = () => {
    if (!convertExpiry) return;
    const selectedPlan = plans.find(p => p.id === convertPlanId);
    convertLead.mutate({
      leadId: lead.id,
      planId: convertPlanId || undefined,
      planName: selectedPlan?.name,
      expiryDate: convertExpiry,
    }, {
      onSuccess: () => {
        setConvertOpen(false);
        onOpenChange(false);
      },
    });
  };

  const handleDelete = () => {
    if (confirm("Remove this lead?")) {
      deleteLead.mutate(lead.id, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[100vw] sm:max-w-lg p-0 flex flex-col" side="right">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-2">
              <div>
                <SheetTitle className="text-lg">{lead.full_name}</SheetTitle>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {lead.phone}
                  </span>
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {lead.email}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleDelete} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 flex-1"
                onClick={() => window.open(`https://wa.me/${normalizePhone(lead.phone)}`, "_blank")}
              >
                <MessageCircle className="h-3.5 w-3.5 text-[hsl(var(--md-green))]" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 flex-1"
                onClick={() => window.open(`tel:${lead.phone}`)}
              >
                <PhoneCall className="h-3.5 w-3.5 text-[hsl(var(--md-blue))]" />
                Call
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Status & Temperature */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Temperature</Label>
                  <Select value={lead.temperature} onValueChange={(v) => handleTempChange(v as LeadTemperature)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMP_OPTIONS.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-1.5">{t.icon} {t.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Trial Date Scheduling */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Trial Date
                </Label>
                <Input
                  type="date"
                  value={lead.trial_scheduled_at ? format(new Date(lead.trial_scheduled_at), "yyyy-MM-dd") : ""}
                  onChange={(e) => handleTrialDateChange(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="h-9"
                />
                {lead.trial_scheduled_at && (
                  <p className="text-xs text-[hsl(var(--md-green))]">
                    Trial on {format(new Date(lead.trial_scheduled_at), "dd MMM yyyy")}
                  </p>
                )}
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground block">Source</span>
                  <span className="font-medium capitalize">{lead.source.replace('_', ' ')}</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground block">Follow-ups</span>
                  <span className="font-medium">{lead.follow_up_count}</span>
                </div>
                {lead.interest_plan && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <span className="text-xs text-muted-foreground block">Interested Plan</span>
                    <span className="font-medium">{lead.interest_plan}</span>
                  </div>
                )}
                {lead.next_follow_up_at && (
                  <div className={`rounded-lg p-3 ${isOverdue ? 'bg-[hsl(var(--md-red-light))]' : 'bg-muted/50'}`}>
                    <span className="text-xs text-muted-foreground block">Next Follow-up</span>
                    <span className={`font-medium text-sm ${isOverdue ? 'text-[hsl(var(--md-red))]' : ''}`}>
                      {format(new Date(lead.next_follow_up_at), "dd MMM, h:mm a")}
                    </span>
                  </div>
                )}
              </div>

              {lead.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground block mb-1">Notes</span>
                  <p className="text-sm">{lead.notes}</p>
                </div>
              )}

              {/* Convert to Member */}
              {lead.status !== "converted" && lead.status !== "not_interested" && (
                <Button
                  className="w-full gap-2"
                  variant="default"
                  onClick={() => setConvertOpen(true)}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Convert to Member
                </Button>
              )}

              {/* Log Activity */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Log Activity</Label>
                <div className="flex gap-2">
                  <Select value={activityType} onValueChange={(v) => setActivityType(v as LeadActivityType)}>
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="visit">Visit</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    placeholder="What happened?"
                    rows={2}
                    className="flex-1"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleLogActivity}
                  disabled={!activityNote.trim() || logActivity.isPending}
                >
                  {logActivity.isPending ? "Logging..." : "Log Activity"}
                </Button>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Activity Timeline</Label>
                {activitiesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No activities yet</p>
                ) : (
                  <div className="space-y-1">
                    {activities.map(a => (
                      <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                        <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                          {activityIcons[a.activity_type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{a.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Convert Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert to Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan (optional)</Label>
              <Select value={convertPlanId} onValueChange={setConvertPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ₹{p.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date *</Label>
              <Input
                type="date"
                value={convertExpiry}
                onChange={(e) => setConvertExpiry(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button onClick={handleConvert} disabled={!convertExpiry || convertLead.isPending}>
              {convertLead.isPending ? "Converting..." : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
