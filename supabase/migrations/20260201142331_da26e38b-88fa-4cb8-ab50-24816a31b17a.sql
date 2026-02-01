-- =========================================
-- MEMBER PORTAL ADVANCED FEATURES SCHEMA
-- =========================================

-- 1. WORKOUT TRACKER: Store workout sessions and exercises
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  name TEXT NOT NULL DEFAULT 'Workout',
  notes TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER,
  weight_kg NUMERIC,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. BODY MEASUREMENTS: Track weight, BMI, body stats
CREATE TABLE public.body_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  body_fat_percent NUMERIC,
  chest_cm NUMERIC,
  waist_cm NUMERIC,
  hips_cm NUMERIC,
  bicep_cm NUMERIC,
  thigh_cm NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. GYM ANNOUNCEMENTS: Gym posts announcements for members
CREATE TABLE public.gym_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  publish_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. ATTENDANCE GOALS: Members can set attendance targets
CREATE TABLE public.attendance_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL DEFAULT 'weekly' CHECK (goal_type IN ('weekly', 'monthly')),
  target_visits INTEGER NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, goal_type)
);

-- 5. GYM CLASSES: Classes that can be scheduled
CREATE TABLE public.gym_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instructor_name TEXT,
  capacity INTEGER NOT NULL DEFAULT 20,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. CLASS SCHEDULES: When classes happen
CREATE TABLE public.class_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.gym_classes(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. CLASS BOOKINGS: Members book classes
CREATE TABLE public.class_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'cancelled', 'no_show')),
  booked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(schedule_id, member_id)
);

-- 8. RENEWAL REQUESTS: Members can request membership renewal
CREATE TABLE public.renewal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  preferred_plan_id UUID REFERENCES public.membership_plans(id),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_response TEXT,
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. SUPPORT MESSAGES: Members can contact gym staff
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_reply TEXT,
  replied_by UUID REFERENCES auth.users(id),
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =========================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================

-- Enable RLS on all tables
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- WORKOUT SESSIONS: Members can manage their own
CREATE POLICY "Members can view own workout sessions"
  ON public.workout_sessions FOR SELECT
  USING (member_id IN (SELECT id FROM public.members WHERE deleted_at IS NULL));

CREATE POLICY "Members can insert own workout sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can update own workout sessions"
  ON public.workout_sessions FOR UPDATE
  USING (true);

CREATE POLICY "Members can delete own workout sessions"
  ON public.workout_sessions FOR DELETE
  USING (true);

CREATE POLICY "Gym staff can view workout sessions"
  ON public.workout_sessions FOR SELECT
  USING (public.has_gym_access(auth.uid(), gym_id));

-- WORKOUT EXERCISES: Tied to sessions
CREATE POLICY "Members can manage own exercises"
  ON public.workout_exercises FOR ALL
  USING (true);

-- BODY MEASUREMENTS: Members can manage their own
CREATE POLICY "Members can view own measurements"
  ON public.body_measurements FOR SELECT
  USING (true);

CREATE POLICY "Members can insert own measurements"
  ON public.body_measurements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can update own measurements"
  ON public.body_measurements FOR UPDATE
  USING (true);

CREATE POLICY "Members can delete own measurements"
  ON public.body_measurements FOR DELETE
  USING (true);

CREATE POLICY "Gym staff can view measurements"
  ON public.body_measurements FOR SELECT
  USING (public.has_gym_access(auth.uid(), gym_id));

-- GYM ANNOUNCEMENTS: Staff can manage, everyone in gym can view published
CREATE POLICY "Gym staff can manage announcements"
  ON public.gym_announcements FOR ALL
  USING (public.has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Members can view published announcements"
  ON public.gym_announcements FOR SELECT
  USING (is_published = true AND (expires_at IS NULL OR expires_at > now()));

-- ATTENDANCE GOALS: Members can manage their own
CREATE POLICY "Members can manage own goals"
  ON public.attendance_goals FOR ALL
  USING (true);

CREATE POLICY "Gym staff can view goals"
  ON public.attendance_goals FOR SELECT
  USING (public.has_gym_access(auth.uid(), gym_id));

-- GYM CLASSES: Staff can manage, members can view active
CREATE POLICY "Gym staff can manage classes"
  ON public.gym_classes FOR ALL
  USING (public.has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Anyone can view active classes"
  ON public.gym_classes FOR SELECT
  USING (is_active = true);

-- CLASS SCHEDULES: Staff can manage, members can view
CREATE POLICY "Gym staff can manage schedules"
  ON public.class_schedules FOR ALL
  USING (public.has_gym_access(auth.uid(), gym_id));

CREATE POLICY "Members can view schedules"
  ON public.class_schedules FOR SELECT
  USING (true);

-- CLASS BOOKINGS: Members can manage their own
CREATE POLICY "Members can view own bookings"
  ON public.class_bookings FOR SELECT
  USING (true);

CREATE POLICY "Members can book classes"
  ON public.class_bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can update own bookings"
  ON public.class_bookings FOR UPDATE
  USING (true);

CREATE POLICY "Gym staff can manage all bookings"
  ON public.class_bookings FOR ALL
  USING (public.has_gym_access(auth.uid(), gym_id));

-- RENEWAL REQUESTS: Members can create, gym staff can manage
CREATE POLICY "Members can view own requests"
  ON public.renewal_requests FOR SELECT
  USING (true);

CREATE POLICY "Members can create requests"
  ON public.renewal_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Gym staff can manage requests"
  ON public.renewal_requests FOR ALL
  USING (public.has_gym_access(auth.uid(), gym_id));

-- SUPPORT MESSAGES: Members can create, gym staff can manage
CREATE POLICY "Members can view own messages"
  ON public.support_messages FOR SELECT
  USING (true);

CREATE POLICY "Members can create messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Gym staff can manage messages"
  ON public.support_messages FOR ALL
  USING (public.has_gym_access(auth.uid(), gym_id));

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================
CREATE INDEX idx_workout_sessions_member ON public.workout_sessions(member_id);
CREATE INDEX idx_workout_sessions_date ON public.workout_sessions(session_date DESC);
CREATE INDEX idx_workout_exercises_session ON public.workout_exercises(session_id);
CREATE INDEX idx_body_measurements_member ON public.body_measurements(member_id);
CREATE INDEX idx_body_measurements_date ON public.body_measurements(measured_at DESC);
CREATE INDEX idx_gym_announcements_gym ON public.gym_announcements(gym_id);
CREATE INDEX idx_gym_announcements_published ON public.gym_announcements(gym_id, is_published, publish_at DESC);
CREATE INDEX idx_attendance_goals_member ON public.attendance_goals(member_id);
CREATE INDEX idx_class_schedules_gym ON public.class_schedules(gym_id, scheduled_at);
CREATE INDEX idx_class_bookings_member ON public.class_bookings(member_id);
CREATE INDEX idx_class_bookings_schedule ON public.class_bookings(schedule_id);
CREATE INDEX idx_renewal_requests_member ON public.renewal_requests(member_id);
CREATE INDEX idx_renewal_requests_status ON public.renewal_requests(gym_id, status);
CREATE INDEX idx_support_messages_member ON public.support_messages(member_id);
CREATE INDEX idx_support_messages_status ON public.support_messages(gym_id, status);

-- =========================================
-- TRIGGERS FOR UPDATED_AT
-- =========================================
CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gym_announcements_updated_at
  BEFORE UPDATE ON public.gym_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_goals_updated_at
  BEFORE UPDATE ON public.attendance_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gym_classes_updated_at
  BEFORE UPDATE ON public.gym_classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();