import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { 
  MessageCircle, Loader2, Check, CheckCheck, 
  Pin, Megaphone, Image, BarChart3
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender_name: string;
  content: string;
  message_type: "text" | "image" | "announcement" | "poll";
  metadata: Record<string, unknown>;
  is_pinned: boolean;
  created_at: string;
  is_read: boolean;
}

const messageTypeIcons = {
  text: MessageCircle,
  image: Image,
  announcement: Megaphone,
  poll: BarChart3,
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

export default function MemberChat() {
  const { member, loading, memberLoading } = useMemberAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const { data: chatData, isLoading } = useQuery({
    queryKey: ["member-chat", member?.id],
    queryFn: async () => {
      if (!member) return { messages: [], unread_count: 0 };
      const { data, error } = await supabase.functions.invoke("member-portal-data", {
        body: { action: "get-chat-messages", member_id: member.id, limit: 100 }
      });
      if (error) throw error;
      return data as { messages: ChatMessage[]; unread_count: number };
    },
    enabled: !!member,
    refetchInterval: 10000, // Poll every 10 seconds for new messages
  });

  const markReadMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      if (!member || messageIds.length === 0) return;
      await supabase.functions.invoke("member-portal-data", {
        body: { 
          action: "mark-messages-read", 
          member_id: member.id,
          data: { message_ids: messageIds }
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-chat"] });
    }
  });

  // Mark messages as read when viewing
  useEffect(() => {
    if (chatData?.messages) {
      const unreadIds = chatData.messages.filter(m => !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
        markReadMutation.mutate(unreadIds);
      }
    }
  }, [chatData?.messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (chatData?.messages && !hasScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      setHasScrolled(true);
    }
  }, [chatData?.messages, hasScrolled]);

  // Set up realtime subscription
  useEffect(() => {
    if (!member) return;
    
    const channel = supabase
      .channel("gym-chat-member")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gym_chat_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["member-chat"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [member, queryClient]);

  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="Chat">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  const messages = chatData?.messages || [];
  const pinnedMessages = messages.filter(m => m.is_pinned);
  const messageGroups = groupMessagesByDate(messages);

  return (
    <MemberLayout title="Chat">
      <div className="flex flex-col h-[calc(100vh-180px)] animate-fade-in">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 text-primary-foreground shadow-lg shadow-primary/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold">Gym Updates</p>
              <p className="text-primary-foreground/70 text-sm">
                Messages from your gym
              </p>
            </div>
          </div>
        </div>

        {/* Pinned Messages */}
        {pinnedMessages.length > 0 && (
          <div className="flex-shrink-0 mb-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Pin className="h-4 w-4" />
              <span>Pinned</span>
            </div>
            <div className="space-y-2">
              {pinnedMessages.slice(0, 2).map((msg) => (
                <Card key={msg.id} className="p-3 bg-primary/5 border-primary/20">
                  <p className="text-sm font-medium line-clamp-2">{msg.content}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Your gym will post updates here
              </p>
            </div>
          ) : (
            messageGroups.map((group) => (
              <div key={group.date}>
                {/* Date Separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {group.date}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {group.messages.map((msg, idx) => {
                    const TypeIcon = messageTypeIcons[msg.message_type];
                    
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "animate-slide-up",
                        )}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        {/* Message Bubble (from gym - left aligned) */}
                        <div className="max-w-[85%]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-primary">
                              {msg.sender_name}
                            </span>
                            {msg.message_type !== "text" && (
                              <Badge variant="secondary" className="h-5 text-[10px] gap-1">
                                <TypeIcon className="h-3 w-3" />
                                {msg.message_type}
                              </Badge>
                            )}
                            {msg.is_pinned && (
                              <Pin className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          
                          <Card className={cn(
                            "p-3 rounded-2xl rounded-tl-sm",
                            msg.message_type === "announcement" 
                              ? "bg-primary/10 border-primary/20" 
                              : "bg-card"
                          )}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            
                            {/* Image attachment */}
                            {msg.message_type === "image" && msg.metadata?.image_url && (
                              <img 
                                src={msg.metadata.image_url as string} 
                                alt="Attachment" 
                                className="mt-2 rounded-lg max-w-full"
                              />
                            )}
                          </Card>
                          
                          <div className="flex items-center gap-2 mt-1 px-1">
                            <span className="text-[10px] text-muted-foreground">
                              {format(parseISO(msg.created_at), "h:mm a")}
                            </span>
                            {msg.is_read ? (
                              <CheckCheck className="h-3 w-3 text-primary" />
                            ) : (
                              <Check className="h-3 w-3 text-muted-foreground" />
                            )}
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

        {/* Read-only indicator */}
        <div className="flex-shrink-0 py-3 border-t bg-muted/30 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">
            📢 This is a broadcast channel from your gym
          </p>
        </div>
      </div>
    </MemberLayout>
  );
}