import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PortalRequest {
  action: string;
  member_id?: string;
  gym_id?: string;
  data?: Record<string, unknown>;
  limit?: number;
  session_token?: string;
}

// ---------- HMAC session token verification ----------
// Must match the algorithm used in supabase/functions/member-auth/index.ts
const SIGNING_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  let s = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [memberId, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const expected = await hmac(`${memberId}.${exp}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? memberId : null;
}
// ------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { action, member_id: body_member_id, gym_id, data, limit = 50, session_token }: PortalRequest = await req.json();

    // Verify HMAC session token — authoritative source for member_id.
    const verifiedMemberId = await verifySessionToken(session_token);
    if (!verifiedMemberId) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid or expired session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (body_member_id && body_member_id !== verifiedMemberId) {
      return new Response(JSON.stringify({ error: "Forbidden: session does not match requested member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const member_id = verifiedMemberId;

    // Resolve gym_id from members table (ignore client-supplied gym_id for safety).
    let memberGymId = gym_id;
    {
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("gym_id")
        .eq("id", member_id)
        .single();
      memberGymId = member?.gym_id;
    }


    // =================== WORKOUT SESSIONS ===================
    if (action === "get-workouts") {
      const { data: workouts, error } = await supabaseAdmin
        .from("workout_sessions")
        .select(`
          *,
          exercises:workout_exercises(*)
        `)
        .eq("member_id", member_id)
        .order("session_date", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return new Response(JSON.stringify({ workouts: workouts || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "create-workout") {
      const { name, session_date, notes, duration_minutes, exercises } = data as {
        name: string;
        session_date?: string;
        notes?: string;
        duration_minutes?: number;
        exercises?: Array<{ exercise_name: string; sets: number; reps?: number; weight_kg?: number; notes?: string }>;
      };

      // Create session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from("workout_sessions")
        .insert({
          member_id,
          gym_id: memberGymId,
          name: name || "Workout",
          session_date: session_date || new Date().toISOString().split("T")[0],
          notes,
          duration_minutes
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add exercises if provided
      if (exercises && exercises.length > 0) {
        const exerciseRecords = exercises.map((ex, idx) => ({
          session_id: session.id,
          exercise_name: ex.exercise_name,
          sets: ex.sets || 1,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          notes: ex.notes,
          order_index: idx
        }));

        await supabaseAdmin.from("workout_exercises").insert(exerciseRecords);
      }

      return new Response(JSON.stringify({ success: true, session }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "add-exercise") {
      const { session_id, exercise_name, sets, reps, weight_kg, notes } = data as {
        session_id: string;
        exercise_name: string;
        sets: number;
        reps?: number;
        weight_kg?: number;
        notes?: string;
      };

      const { data: exercise, error } = await supabaseAdmin
        .from("workout_exercises")
        .insert({ session_id, exercise_name, sets: sets || 1, reps, weight_kg, notes })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, exercise }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "delete-workout") {
      const { session_id } = data as { session_id: string };
      
      const { error } = await supabaseAdmin
        .from("workout_sessions")
        .delete()
        .eq("id", session_id)
        .eq("member_id", member_id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =================== BODY MEASUREMENTS ===================
    if (action === "get-measurements") {
      const { data: measurements, error } = await supabaseAdmin
        .from("body_measurements")
        .select("*")
        .eq("member_id", member_id)
        .order("measured_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return new Response(JSON.stringify({ measurements: measurements || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "add-measurement") {
      const measurementData = data as Record<string, unknown>;
      
      const { data: measurement, error } = await supabaseAdmin
        .from("body_measurements")
        .insert({
          member_id,
          gym_id: memberGymId,
          ...measurementData
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, measurement }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "delete-measurement") {
      const { measurement_id } = data as { measurement_id: string };
      
      const { error } = await supabaseAdmin
        .from("body_measurements")
        .delete()
        .eq("id", measurement_id)
        .eq("member_id", member_id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =================== ANNOUNCEMENTS ===================
    if (action === "get-announcements") {
      const { data: announcements, error } = await supabaseAdmin
        .from("gym_announcements")
        .select("*")
        .eq("gym_id", memberGymId)
        .eq("is_published", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("publish_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return new Response(JSON.stringify({ announcements: announcements || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =================== ATTENDANCE GOALS ===================
    if (action === "get-goals") {
      const { data: goals, error } = await supabaseAdmin
        .from("attendance_goals")
        .select("*")
        .eq("member_id", member_id)
        .eq("is_active", true);

      if (error) throw error;
      return new Response(JSON.stringify({ goals: goals || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "set-goal") {
      const { goal_type, target_visits } = data as { goal_type: "weekly" | "monthly"; target_visits: number };
      
      const { data: goal, error } = await supabaseAdmin
        .from("attendance_goals")
        .upsert({
          member_id,
          gym_id: memberGymId,
          goal_type,
          target_visits,
          is_active: true
        }, { onConflict: "member_id,goal_type" })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, goal }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get-goal-progress") {
      // Get current week/month attendance
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [weeklyResult, monthlyResult, goalsResult] = await Promise.all([
        supabaseAdmin
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("member_id", member_id)
          .gte("check_in_at", weekStart.toISOString()),
        supabaseAdmin
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("member_id", member_id)
          .gte("check_in_at", monthStart.toISOString()),
        supabaseAdmin
          .from("attendance_goals")
          .select("*")
          .eq("member_id", member_id)
          .eq("is_active", true)
      ]);

      return new Response(JSON.stringify({
        weekly_visits: weeklyResult.count || 0,
        monthly_visits: monthlyResult.count || 0,
        goals: goalsResult.data || []
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =================== CLASSES & BOOKINGS ===================
    if (action === "get-classes") {
      const { data: schedules, error } = await supabaseAdmin
        .from("class_schedules")
        .select(`
          *,
          class:gym_classes(*),
          bookings:class_bookings(id, member_id, status)
        `)
        .eq("gym_id", memberGymId)
        .eq("is_cancelled", false)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(limit);

      if (error) throw error;
      
      // Add booking status for current member
      const enrichedSchedules = schedules?.map(s => ({
        ...s,
        my_booking: s.bookings?.find((b: { member_id: string }) => b.member_id === member_id) || null,
        spots_taken: s.bookings?.filter((b: { status: string }) => b.status === "booked").length || 0
      }));

      return new Response(JSON.stringify({ classes: enrichedSchedules || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "book-class") {
      const { schedule_id } = data as { schedule_id: string };
      
      const { data: booking, error } = await supabaseAdmin
        .from("class_bookings")
        .insert({
          schedule_id,
          member_id,
          gym_id: memberGymId,
          status: "booked"
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return new Response(JSON.stringify({ error: "Already booked" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        throw error;
      }
      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "cancel-booking") {
      const { booking_id } = data as { booking_id: string };
      
      const { error } = await supabaseAdmin
        .from("class_bookings")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", booking_id)
        .eq("member_id", member_id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get-my-bookings") {
      const { data: bookings, error } = await supabaseAdmin
        .from("class_bookings")
        .select(`
          *,
          schedule:class_schedules(
            *,
            class:gym_classes(*)
          )
        `)
        .eq("member_id", member_id)
        .order("booked_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return new Response(JSON.stringify({ bookings: bookings || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =================== RENEWAL REQUESTS ===================
    if (action === "get-renewal-requests") {
      const { data: requests, error } = await supabaseAdmin
        .from("renewal_requests")
        .select(`*, preferred_plan:membership_plans(*)`)
        .eq("member_id", member_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return new Response(JSON.stringify({ requests: requests || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "create-renewal-request") {
      const { preferred_plan_id, message } = data as { preferred_plan_id?: string; message?: string };
      
      // Check for existing pending request
      const { data: existing } = await supabaseAdmin
        .from("renewal_requests")
        .select("id")
        .eq("member_id", member_id)
        .eq("status", "pending")
        .single();

      if (existing) {
        return new Response(JSON.stringify({ error: "You already have a pending renewal request" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: request, error } = await supabaseAdmin
        .from("renewal_requests")
        .insert({
          member_id,
          gym_id: memberGymId,
          preferred_plan_id,
          message
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, request }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =================== SUPPORT MESSAGES ===================
    if (action === "get-support-messages") {
      const { data: messages, error } = await supabaseAdmin
        .from("support_messages")
        .select("*")
        .eq("member_id", member_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return new Response(JSON.stringify({ messages: messages || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "create-support-message") {
      const { subject, message } = data as { subject: string; message: string };
      
      const { data: msg, error } = await supabaseAdmin
        .from("support_messages")
        .insert({
          member_id,
          gym_id: memberGymId,
          subject,
          message
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: msg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =================== MEMBERSHIP PLANS (for renewal selection) ===================
    if (action === "get-plans") {
      const { data: plans, error } = await supabaseAdmin
        .from("membership_plans")
        .select("*")
        .eq("gym_id", memberGymId)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ plans: plans || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =================== RCS CHAT (Pro Feature - Read Only for Members) ===================
    if (action === "get-chat-messages") {
      const { data: messages, error } = await supabaseAdmin
        .from("gym_chat_messages")
        .select("*")
        .eq("gym_id", memberGymId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get read receipts for this member
      const messageIds = messages?.map(m => m.id) || [];
      const { data: readReceipts } = await supabaseAdmin
        .from("chat_read_receipts")
        .select("message_id")
        .eq("member_id", member_id)
        .in("message_id", messageIds);

      const readMessageIds = new Set(readReceipts?.map(r => r.message_id) || []);
      
      // Enrich messages with read status
      const enrichedMessages = messages?.map(m => ({
        ...m,
        is_read: readMessageIds.has(m.id)
      })) || [];

      // Count unread messages
      const unreadCount = enrichedMessages.filter(m => !m.is_read).length;

      return new Response(JSON.stringify({ 
        messages: enrichedMessages.reverse(), // Oldest first for chat display
        unread_count: unreadCount 
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "mark-messages-read") {
      const { message_ids } = data as { message_ids: string[] };
      
      if (message_ids && message_ids.length > 0) {
        // Insert read receipts (ignore conflicts)
        const receipts = message_ids.map(id => ({
          message_id: id,
          member_id
        }));

        await supabaseAdmin
          .from("chat_read_receipts")
          .upsert(receipts, { onConflict: "message_id,member_id", ignoreDuplicates: true });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get-unread-count") {
      // Get all message IDs for this gym
      const { data: messages } = await supabaseAdmin
        .from("gym_chat_messages")
        .select("id")
        .eq("gym_id", memberGymId);

      const messageIds = messages?.map(m => m.id) || [];

      if (messageIds.length === 0) {
        return new Response(JSON.stringify({ unread_count: 0 }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get read receipts
      const { data: readReceipts } = await supabaseAdmin
        .from("chat_read_receipts")
        .select("message_id")
        .eq("member_id", member_id)
        .in("message_id", messageIds);

      const readCount = readReceipts?.length || 0;
      const unreadCount = messageIds.length - readCount;

      return new Response(JSON.stringify({ unread_count: unreadCount }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error in member-portal-data:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
