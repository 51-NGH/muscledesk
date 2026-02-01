import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { 
  MessageCircle, Send, Loader2, Pin, PinOff, Trash2,
  Megaphone, Users, CheckCheck, Image, BarChart3
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";

interface ChatMessage {
  id: string;
  gym_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: "text" | "image" | "announcement" | "poll";
  metadata: Record<string, unknown>;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  read_count?: number;
}

const messageTypeConfig = {
  text: { icon: MessageCircle, label: "Message", color: "bg-muted" },
  announcement: { icon: Megaphone, label: "Announcement", color: "bg-primary/10" },
  image: { icon: Image, label: "Image", color: "bg-muted" },
  poll: { icon: BarChart3, label: "Poll", color: "bg-muted" },
};

function formatMessageDate(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";
  
  for (const msg of messages) {
    const date = formatMessageDate(msg.created_at);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  
  return groups;
}

export default function GymChat() {
  const { gymId, user } = useAuth();
  const { data: features } = useGymPlanFeatures();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"text" | "announcement">("text");

  // Check if Pro plan
  const hasAccess = features?.hasRcsChat ?? false;

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["gym-chat-messages", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("gym_chat_messages")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!gymId && hasAccess,
    refetchInterval: 5000,
  });

  const { data: memberCount } = useQuery({
    queryKey: ["member-count", gymId],
    queryFn: async () => {
      if (!gymId) return 0;
      const { count } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .is("deleted_at", null);
      return count || 0;
    },
    enabled: !!gymId,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!gymId || !user || !message.trim()) return;
      
      const { error } = await supabase.from("gym_chat_messages").insert({
        gym_id: gymId,
        sender_id: user.id,
        sender_name: profile?.full_name || "Admin",
        content: message.trim(),
        message_type: messageType,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["gym-chat-messages"] });
      toast.success("Message sent!");
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error(error);
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("gym_chat_messages")
        .update({ is_pinned: !isPinned })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-chat-messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gym_chat_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-chat-messages"] });
      toast.success("Message deleted");
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!gymId || !hasAccess) return;

    const channel = supabase
      .channel("gym-chat-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gym_chat_messages",
          filter: `gym_id=eq.${gymId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["gym-chat-messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gymId, hasAccess, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const pinnedMessages = messages?.filter(m => m.is_pinned) || [];
  const messageGroups = groupMessagesByDate(messages || []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Member Chat</h1>
            <p className="text-muted-foreground">
              Broadcast messages to all your members
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{memberCount} members will receive messages</span>
          </div>
        </div>

        {!hasAccess ? (
          <Card className="relative p-8 min-h-[400px]">
            <UpgradeOverlay 
              feature="RCS Chat"
              recommendedPlan="pro"
              description="Send broadcast messages to all your gym members with read receipts and rich message types."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Chat Area */}
            <Card className="lg:col-span-3 flex flex-col h-[calc(100vh-220px)]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm text-muted-foreground">
                      Send your first message to all members
                    </p>
                  </div>
                ) : (
                  messageGroups.map((group) => (
                    <div key={group.date}>
                      {/* Date Separator */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground font-medium px-2">
                          {group.date}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>

                      {/* Messages */}
                      <div className="space-y-3">
                        {group.messages.map((msg) => {
                          const config = messageTypeConfig[msg.message_type];
                          const TypeIcon = config.icon;
                          
                          return (
                            <div key={msg.id} className="flex justify-end group">
                              <div className="max-w-[80%]">
                                <div className="flex items-center justify-end gap-2 mb-1">
                                  {msg.is_pinned && (
                                    <Pin className="h-3 w-3 text-primary" />
                                  )}
                                  {msg.message_type !== "text" && (
                                    <Badge variant="outline" className="h-5 text-[10px] gap-1">
                                      <TypeIcon className="h-3 w-3" />
                                      {config.label}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {msg.sender_name}
                                  </span>
                                </div>
                                
                                <Card className={cn(
                                  "p-3 rounded-2xl rounded-tr-sm",
                                  msg.message_type === "announcement"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-primary/10"
                                )}>
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </Card>
                                
                                <div className="flex items-center justify-end gap-2 mt-1 px-1">
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(parseISO(msg.created_at), "h:mm a")}
                                  </span>
                                  <CheckCheck className="h-3 w-3 text-primary" />
                                  
                                  {/* Actions on hover */}
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => togglePinMutation.mutate({ id: msg.id, isPinned: msg.is_pinned })}
                                    >
                                      {msg.is_pinned ? (
                                        <PinOff className="h-3 w-3" />
                                      ) : (
                                        <Pin className="h-3 w-3" />
                                      )}
                                    </Button>
                                    
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently delete this message. Members who haven't read it yet won't see it.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteMutation.mutate(msg.id)}
                                            className="bg-destructive text-destructive-foreground"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex items-end gap-3">
                  <Select 
                    value={messageType} 
                    onValueChange={(v) => setMessageType(v as "text" | "announcement")}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </div>
                      </SelectItem>
                      <SelectItem value="announcement">
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4" />
                          Announcement
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Textarea
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-h-[44px] max-h-32 resize-none"
                    rows={1}
                  />
                  
                  <Button 
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    size="icon"
                    className="h-11 w-11"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </Card>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Stats */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Reach
                </h3>
                <div className="text-3xl font-bold text-primary">{memberCount}</div>
                <p className="text-sm text-muted-foreground">members will see your messages</p>
              </Card>

              {/* Pinned Messages */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Pin className="h-4 w-4" />
                  Pinned Messages
                </h3>
                {pinnedMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pinned messages</p>
                ) : (
                  <div className="space-y-2">
                    {pinnedMessages.map((msg) => (
                      <div key={msg.id} className="text-sm p-2 bg-muted rounded-lg">
                        <p className="line-clamp-2">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(msg.created_at), "MMM d")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Tips */}
              <Card className="p-4 bg-primary/5">
                <h3 className="font-semibold mb-2">💡 Tips</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Use <strong>Announcements</strong> for important updates</li>
                  <li>• Pin messages to highlight them</li>
                  <li>• Members see messages in realtime</li>
                  <li>• Read receipts show engagement</li>
                </ul>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}