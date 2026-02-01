-- Create gym chat messages table for Pro plan RCS-style chat
CREATE TABLE public.gym_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'announcement', 'poll')),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create read receipts table
CREATE TABLE public.chat_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.gym_chat_messages(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, member_id)
);

-- Enable RLS
ALTER TABLE public.gym_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gym_chat_messages
CREATE POLICY "Gym staff can manage chat messages"
  ON public.gym_chat_messages FOR ALL
  USING (has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Members can view chat messages"
  ON public.gym_chat_messages FOR SELECT
  USING (true);

-- RLS Policies for chat_read_receipts
CREATE POLICY "Members can manage own read receipts"
  ON public.chat_read_receipts FOR ALL
  USING (true);

CREATE POLICY "Gym staff can view read receipts"
  ON public.chat_read_receipts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM gym_chat_messages m 
    WHERE m.id = message_id AND has_gym_access(auth.uid(), m.gym_id)
  ));

-- Indexes for performance
CREATE INDEX idx_gym_chat_messages_gym ON public.gym_chat_messages(gym_id, created_at DESC);
CREATE INDEX idx_gym_chat_messages_pinned ON public.gym_chat_messages(gym_id, is_pinned, created_at DESC);
CREATE INDEX idx_chat_read_receipts_member ON public.chat_read_receipts(member_id);
CREATE INDEX idx_chat_read_receipts_message ON public.chat_read_receipts(message_id);

-- Trigger for updated_at
CREATE TRIGGER update_gym_chat_messages_updated_at
  BEFORE UPDATE ON public.gym_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_chat_messages;