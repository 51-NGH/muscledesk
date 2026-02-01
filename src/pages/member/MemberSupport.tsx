import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { 
  MessageCircle, Loader2, Send, Plus, X, 
  Clock, CheckCircle, AlertCircle, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SupportMessage {
  id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
}

const statusConfig = {
  open: { color: "text-[hsl(var(--md-orange))]", bg: "bg-[hsl(var(--md-orange))]/10", icon: Clock, label: "Open" },
  in_progress: { color: "text-primary", bg: "bg-primary/10", icon: AlertCircle, label: "In Progress" },
  resolved: { color: "text-[hsl(var(--md-green))]", bg: "bg-[hsl(var(--md-green))]/10", icon: CheckCircle, label: "Resolved" },
  closed: { color: "text-muted-foreground", bg: "bg-muted", icon: CheckCircle, label: "Closed" }
};

export default function MemberSupport() {
  const { member, loading, memberLoading } = useMemberAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["member-support", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: { action: "get-support-messages", member_id: member.id }
      });
      if (error) throw error;
      return (data?.messages || []) as SupportMessage[];
    },
    enabled: !!member,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Not logged in");
      if (!subject.trim() || !message.trim()) {
        throw new Error("Subject and message are required");
      }
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: {
          action: "create-support-message",
          member_id: member.id,
          data: { subject: subject.trim(), message: message.trim() }
        }
      });
      if (error) throw error;
      if (!data?.success) throw new Error("Failed to send message");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-support"] });
      setShowForm(false);
      setSubject("");
      setMessage("");
      toast.success("Message sent! 📩");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Support">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  const openMessages = messages?.filter(m => m.status === "open" || m.status === "in_progress").length || 0;

  return (
    <MemberLayout title="Support">
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/70 text-sm">Contact</p>
              <p className="text-2xl font-bold mt-1">Gym Support</p>
              <p className="text-primary-foreground/70 text-xs mt-2">
                {openMessages} active conversations
              </p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <MessageCircle className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* New Message Button */}
        {!showForm && (
          <Button 
            className="w-full h-12 rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            New Message
          </Button>
        )}

        {/* New Message Form */}
        {showForm && (
          <Card className="p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">New Message</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  placeholder="What's this about?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Describe your question or issue..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <Button 
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !subject.trim() || !message.trim()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Messages List */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <HelpCircle className="h-4 w-4 text-primary" />
            Your Messages
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your support conversations will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, idx) => {
                const config = statusConfig[msg.status];
                const Icon = config.icon;

                return (
                  <Card 
                    key={msg.id} 
                    className="p-4 animate-slide-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(msg.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-semibold text-sm">{msg.subject}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {msg.message}
                    </p>

                    {msg.admin_reply && (
                      <div className="mt-3 p-3 bg-muted rounded-lg border-l-4 border-primary">
                        <p className="text-xs font-medium text-primary mb-1">Gym Response:</p>
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.admin_reply}
                        </p>
                        {msg.replied_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(parseISO(msg.replied_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact Info */}
        <Card className="p-4 bg-muted/50">
          <p className="text-xs text-center text-muted-foreground">
            For urgent matters, please contact your gym directly during business hours.
          </p>
        </Card>
      </div>
    </MemberLayout>
  );
}
