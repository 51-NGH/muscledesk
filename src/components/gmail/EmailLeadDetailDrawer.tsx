import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Send, Flame, User, Mail, Clock, CalendarPlus,
  MessageSquare, CheckCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { type EmailLead, type EmailLeadStatus, type EmailLeadTemperature, useUpdateEmailLead, useReplyToLead, useCreateFollowup, useEmailReplyLogs } from "@/hooks/useEmailLeads";
import { useIsMobile } from "@/hooks/use-mobile";

const statusOptions: { value: EmailLeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "trial", label: "Trial" },
  { value: "negotiation", label: "Negotiation" },
  { value: "converted", label: "Converted" },
  { value: "not_interested", label: "Not Interested" },
];

const temperatureOptions: { value: EmailLeadTemperature; label: string; color: string }[] = [
  { value: "hot", label: "🔥 Hot", color: "text-red-500" },
  { value: "warm", label: "🌡️ Warm", color: "text-orange-500" },
  { value: "cold", label: "❄️ Cold", color: "text-blue-500" },
];

interface EmailLeadDetailDrawerProps {
  lead: EmailLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailLeadDetailDrawer({ lead, open, onOpenChange }: EmailLeadDetailDrawerProps) {
  const isMobile = useIsMobile();
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [followupDate, setFollowupDate] = useState("");
  const [followupNotes, setFollowupNotes] = useState("");

  const updateLead = useUpdateEmailLead();
  const replyToLead = useReplyToLead();
  const createFollowup = useCreateFollowup();
  const { data: replyLogs = [] } = useEmailReplyLogs(lead?.id || "");

  if (!lead) return null;

  const handleStatusChange = (status: EmailLeadStatus) => {
    updateLead.mutate({ id: lead.id, lead_status: status });
  };

  const handleTemperatureChange = (temp: EmailLeadTemperature) => {
    updateLead.mutate({ id: lead.id, temperature: temp });
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await replyToLead.mutateAsync({ lead_id: lead.id, message: replyText });
    setReplyText("");
    setShowReply(false);
  };

  const handleScheduleFollowup = async () => {
    if (!followupDate) return;
    await createFollowup.mutateAsync({
      email_lead_id: lead.id,
      follow_up_at: new Date(followupDate).toISOString(),
      notes: followupNotes || undefined,
    });
    setFollowupDate("");
    setFollowupNotes("");
    setShowFollowup(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`${isMobile ? "w-full" : "sm:max-w-lg"} overflow-y-auto`}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <User className="h-5 w-5 text-muted-foreground" />
            {lead.sender_name || lead.sender_email}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Contact Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {lead.sender_email}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </div>
          </div>

          {/* Status & Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={lead.lead_status} onValueChange={(v) => handleStatusChange(v as EmailLeadStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Temperature</Label>
              <Select value={lead.temperature} onValueChange={(v) => handleTemperatureChange(v as EmailLeadTemperature)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {temperatureOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Email Content */}
          <div>
            <p className="font-medium text-sm mb-1">{lead.subject || "(No subject)"}</p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {lead.email_body || "(No content)"}
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={showReply ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => { setShowReply(!showReply); setShowFollowup(false); }}
            >
              <Send className="h-3.5 w-3.5" />
              Reply
            </Button>
            <Button
              variant={showFollowup ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => { setShowFollowup(!showFollowup); setShowReply(false); }}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Follow-up
            </Button>
            {lead.lead_status !== "converted" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-green-600"
                onClick={() => handleStatusChange("converted")}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Convert
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {showReply && (
            <div className="space-y-2 bg-muted/30 rounded-lg p-3">
              <Label className="text-xs">Reply to {lead.sender_email}</Label>
              <Textarea
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
              />
              <Button
                className="w-full gap-2"
                size="sm"
                onClick={handleReply}
                disabled={!replyText.trim() || replyToLead.isPending}
              >
                <Send className="h-3.5 w-3.5" />
                {replyToLead.isPending ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          )}

          {/* Follow-up Form */}
          {showFollowup && (
            <div className="space-y-2 bg-muted/30 rounded-lg p-3">
              <Label className="text-xs">Schedule Follow-up</Label>
              <Input
                type="datetime-local"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
              />
              <Textarea
                placeholder="Notes (optional)..."
                value={followupNotes}
                onChange={(e) => setFollowupNotes(e.target.value)}
                rows={2}
              />
              <Button
                className="w-full gap-2"
                size="sm"
                onClick={handleScheduleFollowup}
                disabled={!followupDate || createFollowup.isPending}
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                {createFollowup.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </div>
          )}

          {/* Reply History */}
          {replyLogs.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Conversation
                </p>
                <div className="space-y-2">
                  {replyLogs.map((log: any) => (
                    <div key={log.id} className="bg-primary/5 rounded-lg p-2.5 text-sm">
                      <p className="text-xs text-muted-foreground mb-1">
                        You • {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </p>
                      <p className="whitespace-pre-wrap">{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <Separator />
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Add notes about this lead..."
              defaultValue={lead.notes || ""}
              onBlur={(e) => {
                if (e.target.value !== (lead.notes || "")) {
                  updateLead.mutate({ id: lead.id, notes: e.target.value || null });
                }
              }}
              rows={3}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
