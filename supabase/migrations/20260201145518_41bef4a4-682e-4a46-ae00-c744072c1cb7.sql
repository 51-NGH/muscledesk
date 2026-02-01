-- =====================================================
-- COMPREHENSIVE RLS SECURITY HARDENING
-- Fix all overly permissive "USING (true)" policies
-- =====================================================

-- =====================================================
-- 1. CLASS_BOOKINGS - Fix member access
-- =====================================================
DROP POLICY IF EXISTS "Members can book classes" ON public.class_bookings;
DROP POLICY IF EXISTS "Members can update own bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Members can view own bookings" ON public.class_bookings;

-- Members can only view their own bookings
CREATE POLICY "Members can view own bookings" 
ON public.class_bookings 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only book classes for themselves
CREATE POLICY "Members can book classes" 
ON public.class_bookings 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only update their own bookings
CREATE POLICY "Members can update own bookings" 
ON public.class_bookings 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- =====================================================
-- 2. RENEWAL_REQUESTS - Fix member access
-- =====================================================
DROP POLICY IF EXISTS "Members can create requests" ON public.renewal_requests;
DROP POLICY IF EXISTS "Members can view own requests" ON public.renewal_requests;

-- Members can only view their own requests
CREATE POLICY "Members can view own requests" 
ON public.renewal_requests 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only create requests for themselves
CREATE POLICY "Members can create requests" 
ON public.renewal_requests 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- =====================================================
-- 3. ATTENDANCE_GOALS - Fix member access
-- =====================================================
DROP POLICY IF EXISTS "Members can manage own goals" ON public.attendance_goals;

-- Members can only view their own goals
CREATE POLICY "Members can view own goals" 
ON public.attendance_goals 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only insert goals for themselves
CREATE POLICY "Members can insert own goals" 
ON public.attendance_goals 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only update their own goals
CREATE POLICY "Members can update own goals" 
ON public.attendance_goals 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only delete their own goals
CREATE POLICY "Members can delete own goals" 
ON public.attendance_goals 
FOR DELETE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- =====================================================
-- 4. WORKOUT_SESSIONS - Fix member access
-- =====================================================
DROP POLICY IF EXISTS "Members can delete own workout sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Members can insert own workout sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Members can update own workout sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Members can view own workout sessions" ON public.workout_sessions;

-- Members can only view their own workout sessions
CREATE POLICY "Members can view own workout sessions" 
ON public.workout_sessions 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only insert workout sessions for themselves
CREATE POLICY "Members can insert own workout sessions" 
ON public.workout_sessions 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only update their own workout sessions
CREATE POLICY "Members can update own workout sessions" 
ON public.workout_sessions 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only delete their own workout sessions
CREATE POLICY "Members can delete own workout sessions" 
ON public.workout_sessions 
FOR DELETE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- =====================================================
-- 5. WORKOUT_EXERCISES - Fix member access (via session)
-- =====================================================
DROP POLICY IF EXISTS "Members can manage own exercises" ON public.workout_exercises;

-- Members can only view exercises from their own sessions
CREATE POLICY "Members can view own exercises" 
ON public.workout_exercises 
FOR SELECT 
USING (
  session_id IN (
    SELECT ws.id FROM public.workout_sessions ws
    JOIN public.members m ON ws.member_id = m.id
    WHERE m.auth_user_id = auth.uid() 
    AND m.deleted_at IS NULL
  )
);

-- Members can only insert exercises for their own sessions
CREATE POLICY "Members can insert own exercises" 
ON public.workout_exercises 
FOR INSERT 
WITH CHECK (
  session_id IN (
    SELECT ws.id FROM public.workout_sessions ws
    JOIN public.members m ON ws.member_id = m.id
    WHERE m.auth_user_id = auth.uid() 
    AND m.deleted_at IS NULL
  )
);

-- Members can only update exercises from their own sessions
CREATE POLICY "Members can update own exercises" 
ON public.workout_exercises 
FOR UPDATE 
USING (
  session_id IN (
    SELECT ws.id FROM public.workout_sessions ws
    JOIN public.members m ON ws.member_id = m.id
    WHERE m.auth_user_id = auth.uid() 
    AND m.deleted_at IS NULL
  )
);

-- Members can only delete exercises from their own sessions
CREATE POLICY "Members can delete own exercises" 
ON public.workout_exercises 
FOR DELETE 
USING (
  session_id IN (
    SELECT ws.id FROM public.workout_sessions ws
    JOIN public.members m ON ws.member_id = m.id
    WHERE m.auth_user_id = auth.uid() 
    AND m.deleted_at IS NULL
  )
);

-- =====================================================
-- 6. BODY_MEASUREMENTS - Fix member access
-- =====================================================
DROP POLICY IF EXISTS "Members can delete own measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Members can insert own measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Members can update own measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Members can view own measurements" ON public.body_measurements;

-- Members can only view their own measurements
CREATE POLICY "Members can view own measurements" 
ON public.body_measurements 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only insert measurements for themselves
CREATE POLICY "Members can insert own measurements" 
ON public.body_measurements 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only update their own measurements
CREATE POLICY "Members can update own measurements" 
ON public.body_measurements 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only delete their own measurements
CREATE POLICY "Members can delete own measurements" 
ON public.body_measurements 
FOR DELETE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- =====================================================
-- 7. CHAT_READ_RECEIPTS - Fix member access
-- =====================================================
DROP POLICY IF EXISTS "Members can manage own read receipts" ON public.chat_read_receipts;

-- Members can only view their own read receipts
CREATE POLICY "Members can view own read receipts" 
ON public.chat_read_receipts 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only insert read receipts for themselves
CREATE POLICY "Members can insert own read receipts" 
ON public.chat_read_receipts 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only update their own read receipts
CREATE POLICY "Members can update own read receipts" 
ON public.chat_read_receipts 
FOR UPDATE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only delete their own read receipts
CREATE POLICY "Members can delete own read receipts" 
ON public.chat_read_receipts 
FOR DELETE 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- =====================================================
-- 8. SUPPORT_MESSAGES - Fix member access
-- =====================================================
DROP POLICY IF EXISTS "Members can create messages" ON public.support_messages;
DROP POLICY IF EXISTS "Members can view own messages" ON public.support_messages;

-- Members can only view their own support messages
CREATE POLICY "Members can view own messages" 
ON public.support_messages 
FOR SELECT 
USING (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- Members can only create support messages for themselves
CREATE POLICY "Members can create messages" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members 
    WHERE auth_user_id = auth.uid() 
    AND deleted_at IS NULL
  )
);

-- =====================================================
-- 9. CLASS_SCHEDULES - Keep public read but verify
-- =====================================================
-- Note: Class schedules should be viewable by all members
-- The current "Members can view schedules" with USING (true) is intentional
-- as class schedules are public information for the gym